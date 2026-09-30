"""Auth use cases: OAuth session exchange, session authentication, logout."""
from datetime import timedelta, timezone
from typing import Optional

from app.application.ports import (
    BaseProfileRepository,
    Clock,
    GenerationRepository,
    IdGenerator,
    OAuthProvider,
    SessionRepository,
    UserRepository,
)
from app.domain.errors import AuthenticationError, UpstreamError, ValidationError
from app.domain.models import AuthenticatedUser, Session, User
from app.domain.rules import SESSION_TTL_DAYS, decide_role, normalize_oauth_profile


class ProcessOAuthSession:
    def __init__(
        self,
        oauth: OAuthProvider,
        users: UserRepository,
        sessions: SessionRepository,
        generations: GenerationRepository,
        base_profiles: BaseProfileRepository,
        clock: Clock,
        ids: IdGenerator,
        admin_email: str,
    ):
        self.oauth, self.users, self.sessions = oauth, users, sessions
        self.generations, self.base_profiles = generations, base_profiles
        self.clock, self.ids, self.admin_email = clock, ids, admin_email.strip().lower()

    async def execute(self, session_id: Optional[str]) -> AuthenticatedUser:
        if not session_id:
            raise ValidationError("X-Session-ID requis")
        try:
            profile = normalize_oauth_profile(self.oauth.fetch_profile(session_id))
        except ValidationError:
            raise
        except Exception as e:
            raise UpstreamError(f"OAuth fetch failed: {e}") from e

        now = self.clock.now()
        user = await self.users.find_by_email(profile.email)
        if user:
            name = profile.name or user.name
            picture = profile.picture or user.picture
            await self.users.update_profile(user.user_id, name, picture)
            user = user.model_copy(update={"name": name, "picture": picture})
        else:
            role = decide_role(profile.email, self.admin_email, await self.users.count_admins())
            user = User(
                user_id=f"user_{self.ids.new_id()[:12]}",
                email=profile.email,
                name=profile.name or "",
                picture=profile.picture,
                role=role,
                created_at=now.isoformat(),
            )
            await self.users.insert(user)
            if role == "admin":
                await self.generations.claim_orphans(user.user_id)
                await self.base_profiles.claim_orphans(user.user_id)

        token = profile.session_token or self.ids.new_id()
        await self.sessions.insert(
            Session(
                user_id=user.user_id,
                session_token=token,
                expires_at=now + timedelta(days=SESSION_TTL_DAYS),
                created_at=now,
            )
        )
        return AuthenticatedUser(user=user, session_token=token)


class AuthenticateSession:
    def __init__(self, sessions: SessionRepository, users: UserRepository, clock: Clock):
        self.sessions, self.users, self.clock = sessions, users, clock

    async def execute(self, token: Optional[str]) -> User:
        if not token:
            raise AuthenticationError("Non authentifié")
        session = await self.sessions.find_by_token(token)
        if not session:
            raise AuthenticationError("Session invalide ou expirée")
        expires_at = session.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < self.clock.now():
            raise AuthenticationError("Session invalide ou expirée")
        user = await self.users.find_by_id(session.user_id)
        if not user:
            raise AuthenticationError("Session invalide ou expirée")
        return user


class Logout:
    def __init__(self, sessions: SessionRepository):
        self.sessions = sessions

    async def execute(self, token: Optional[str]) -> None:
        if token:
            await self.sessions.delete_by_token(token)
