"""Base profile ("CV de base") pinned by a user for reuse."""
from typing import Any, Dict, Optional

from app.application.ports import BaseProfileRepository, Clock
from app.domain.models import BaseProfile


class GetBaseProfile:
    def __init__(self, base_profiles: BaseProfileRepository):
        self.base_profiles = base_profiles

    async def execute(self, user_id: str) -> Optional[BaseProfile]:
        return await self.base_profiles.find(user_id)


class SaveBaseProfile:
    def __init__(self, base_profiles: BaseProfileRepository, clock: Clock):
        self.base_profiles, self.clock = base_profiles, clock

    async def execute(self, user_id: str, payload: Dict[str, Any]) -> BaseProfile:
        profile = BaseProfile(
            user_id=user_id,
            profile_text=payload.get("profile_text", "") or "",
            cv=payload.get("cv") or {},
            photo_data_url=payload.get("photo_data_url"),
            updated_at=self.clock.now().isoformat(),
        )
        await self.base_profiles.upsert(profile)
        return profile


class DeleteBaseProfile:
    def __init__(self, base_profiles: BaseProfileRepository):
        self.base_profiles = base_profiles

    async def execute(self, user_id: str) -> None:
        await self.base_profiles.delete(user_id)
