"""System adapters: wall clock and UUID generator."""
import uuid
from datetime import datetime, timezone


class SystemClock:
    def now(self) -> datetime:
        return datetime.now(timezone.utc)


class UuidGenerator:
    def new_id(self) -> str:
        return str(uuid.uuid4())
