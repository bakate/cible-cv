"""In-memory fakes implementing the application ports — no Mongo, no network, no LLM."""
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.domain.models import BaseProfile, Generation, GenerationSummary, OAuthProfile, Session, User


class FakeClock:
    def __init__(self, at: Optional[datetime] = None):
        self.at = at or datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)

    def now(self) -> datetime:
        return self.at


class SequenceIds:
    def __init__(self):
        self.n = 0

    def new_id(self) -> str:
        self.n += 1
        return f"id-{self.n:04d}-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"


class FakeUsers:
    def __init__(self):
        self.items: Dict[str, User] = {}

    async def find_by_email(self, email):
        return next((u for u in self.items.values() if u.email == email), None)

    async def find_by_id(self, user_id):
        return self.items.get(user_id)

    async def count_admins(self):
        return sum(1 for u in self.items.values() if u.is_admin)

    async def insert(self, user):
        self.items[user.user_id] = user

    async def update_profile(self, user_id, name, picture):
        self.items[user_id] = self.items[user_id].model_copy(update={"name": name, "picture": picture})


class FakeSessions:
    def __init__(self):
        self.items: Dict[str, Session] = {}

    async def insert(self, session):
        self.items[session.session_token] = session

    async def find_by_token(self, token):
        return self.items.get(token)

    async def delete_by_token(self, token):
        self.items.pop(token, None)


class FakeGenerations:
    def __init__(self):
        self.items: Dict[str, Generation] = {}
        self.claimed_by: Optional[str] = None

    def _visible(self, g: Generation, owner_id: Optional[str]) -> bool:
        return owner_id is None or g.user_id == owner_id

    async def insert(self, generation):
        self.items[generation.id] = generation

    async def list_summaries(self, owner_id, limit):
        docs = [g for g in self.items.values() if self._visible(g, owner_id)]
        docs.sort(key=lambda g: g.created_at, reverse=True)
        return [
            GenerationSummary(**g.model_dump(), match_score=g.adaptations.get("match_score", 0))
            for g in docs[:limit]
        ]

    async def find_by_id(self, gen_id, owner_id):
        g = self.items.get(gen_id)
        return g if g and self._visible(g, owner_id) else None

    async def update(self, gen_id, owner_id, patch):
        g = await self.find_by_id(gen_id, owner_id)
        if not g:
            return None
        self.items[gen_id] = g.model_copy(update=patch)
        return self.items[gen_id]

    async def delete(self, gen_id, owner_id):
        g = await self.find_by_id(gen_id, owner_id)
        if not g:
            return False
        del self.items[gen_id]
        return True

    async def claim_orphans(self, user_id):
        self.claimed_by = user_id


class FakeBaseProfiles:
    def __init__(self):
        self.items: Dict[str, BaseProfile] = {}

    async def find(self, user_id):
        return self.items.get(user_id)

    async def upsert(self, profile):
        self.items[profile.user_id] = profile

    async def delete(self, user_id):
        self.items.pop(user_id, None)

    async def claim_orphans(self, user_id):
        pass


class ScriptedLlm:
    """Returns canned JSON payloads; records prompts it received."""

    def __init__(self, payload: Any, fail: bool = False):
        self.payload, self.fail, self.calls = payload, fail, []

    async def complete(self, system_prompt, user_text):
        self.calls.append((system_prompt, user_text))
        if self.fail:
            raise RuntimeError("llm down")
        return "```json\n" + json.dumps(self.payload, ensure_ascii=False) + "\n```"


class FakeOAuth:
    def __init__(self, profile: Optional[OAuthProfile] = None, fail: bool = False):
        self.profile, self.fail = profile, fail

    def fetch_profile(self, session_id):
        if self.fail:
            raise RuntimeError("oauth unreachable")
        return self.profile


class FakeExtractor:
    def __init__(self, text="", fail=False):
        self.text, self.fail = text, fail

    def extract(self, filename, content):
        if self.fail:
            raise RuntimeError("corrupt")
        return self.text


class FakeFetcher:
    def __init__(self, text="", fail=False):
        self.text, self.fail = text, fail

    def fetch_text(self, url):
        if self.fail:
            raise RuntimeError("blocked")
        return self.text


class FakeRenderer:
    def cv_pdf(self, cv, layout):
        return f"PDF:{layout}".encode()

    def cv_docx(self, cv):
        return b"DOCX:cv"

    def letter_pdf(self, letter, sender_cv, company):
        return f"PDF:letter:{company}".encode()

    def letter_docx(self, letter, sender_cv, company):
        return b"DOCX:letter"


def make_user(user_id="u1", role="user") -> User:
    return User(user_id=user_id, email=f"{user_id}@x.io", name=user_id, role=role, created_at="2026-01-01T00:00:00+00:00")


def make_generation(gen_id="g1", user_id="u1", **overrides) -> Generation:
    base: Dict[str, Any] = dict(
        id=gen_id, user_id=user_id, title="Dev — Acme", company="Acme", position="Dev", template="corporate",
        profile_text="p" * 60, job_text="j" * 60, cv={"full_name": "Jane Doe"}, letter={"body": "Bonjour"},
        adaptations={"match_score": 77}, created_at="2026-05-01T00:00:00+00:00",
    )
    base.update(overrides)
    return Generation(**base)


def summaries_ids(items: List[GenerationSummary]) -> List[str]:
    return [s.id for s in items]
