"""FastAPI dependencies: container access and current-user resolution."""
from typing import Optional

from fastapi import Cookie, Depends, Header, Request

from app.container import Container
from app.domain.models import OwnerScope, User

SESSION_COOKIE = "session_token"


def get_container(request: Request) -> Container:
    return request.app.state.container


def extract_session_token(cookie_token: Optional[str], auth_header: Optional[str]) -> Optional[str]:
    if cookie_token:
        return cookie_token
    if auth_header and auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return None


async def get_current_user(
    container: Container = Depends(get_container),
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
) -> User:
    return await container.authenticate_session.execute(extract_session_token(session_token, authorization))


def get_scope(user: User = Depends(get_current_user)) -> OwnerScope:
    return OwnerScope.for_user(user)
