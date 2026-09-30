"""MongoDB repositories (Motor). Only place that knows about collections and `_id`."""
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.domain.models import BaseProfile, Generation, GenerationSummary, Session, User

_NO_ID = {"_id": 0}


def _owner_query(owner_id: Optional[str], **extra: Any) -> Dict[str, Any]:
    query: Dict[str, Any] = dict(extra)
    if owner_id is not None:
        query["user_id"] = owner_id
    return query


class MongoUserRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db.users

    async def find_by_email(self, email: str) -> Optional[User]:
        doc = await self.col.find_one({"email": email}, _NO_ID)
        return User.model_validate(doc) if doc else None

    async def find_by_id(self, user_id: str) -> Optional[User]:
        doc = await self.col.find_one({"user_id": user_id}, _NO_ID)
        return User.model_validate(doc) if doc else None

    async def count_admins(self) -> int:
        return await self.col.count_documents({"role": "admin"})

    async def insert(self, user: User) -> None:
        await self.col.insert_one(user.model_dump())

    async def update_profile(self, user_id: str, name: str, picture: Optional[str]) -> None:
        await self.col.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})


class MongoSessionRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db.user_sessions

    async def insert(self, session: Session) -> None:
        await self.col.insert_one(session.model_dump())

    async def find_by_token(self, token: str) -> Optional[Session]:
        doc = await self.col.find_one({"session_token": token}, _NO_ID)
        return Session.model_validate(doc) if doc else None

    async def delete_by_token(self, token: str) -> None:
        await self.col.delete_one({"session_token": token})


class MongoGenerationRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db.generations

    async def insert(self, generation: Generation) -> None:
        await self.col.insert_one(generation.model_dump())

    async def list_summaries(self, owner_id: Optional[str], limit: int) -> List[GenerationSummary]:
        projection = {"_id": 0, "id": 1, "title": 1, "company": 1, "position": 1, "template": 1, "created_at": 1, "adaptations": 1, "user_id": 1}
        docs = await self.col.find(_owner_query(owner_id), projection).sort("created_at", -1).limit(limit).to_list(limit)
        return [
            GenerationSummary.model_validate({**d, "match_score": (d.get("adaptations") or {}).get("match_score", 0) or 0})
            for d in docs
        ]

    async def find_by_id(self, gen_id: str, owner_id: Optional[str]) -> Optional[Generation]:
        doc = await self.col.find_one(_owner_query(owner_id, id=gen_id), _NO_ID)
        return Generation.model_validate(doc) if doc else None

    async def update(self, gen_id: str, owner_id: Optional[str], patch: Dict[str, Any]) -> Optional[Generation]:
        result = await self.col.update_one(_owner_query(owner_id, id=gen_id), {"$set": patch})
        if result.matched_count == 0:
            return None
        return await self.find_by_id(gen_id, owner_id)

    async def delete(self, gen_id: str, owner_id: Optional[str]) -> bool:
        result = await self.col.delete_one(_owner_query(owner_id, id=gen_id))
        return result.deleted_count > 0

    async def claim_orphans(self, user_id: str) -> None:
        await self.col.update_many({"user_id": {"$exists": False}}, {"$set": {"user_id": user_id}})


class MongoBaseProfileRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db.base_profile

    async def find(self, user_id: str) -> Optional[BaseProfile]:
        doc = await self.col.find_one({"user_id": user_id}, _NO_ID)
        return BaseProfile.model_validate(doc) if doc else None

    async def upsert(self, profile: BaseProfile) -> None:
        await self.col.update_one({"user_id": profile.user_id}, {"$set": profile.model_dump()}, upsert=True)

    async def delete(self, user_id: str) -> None:
        await self.col.delete_one({"user_id": user_id})

    async def claim_orphans(self, user_id: str) -> None:
        await self.col.update_many({"user_id": {"$exists": False}}, {"$set": {"user_id": user_id}})
