"""Domain models (Pydantic). Persistence-agnostic: `id` is a UUID string, never a Mongo ObjectId."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

CvData = Dict[str, Any]
LetterData = Dict[str, Any]
AdaptationsData = Dict[str, Any]


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "user"
    created_at: str

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime


class AuthenticatedUser(BaseModel):
    user: User
    session_token: str


class OAuthProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    session_token: Optional[str] = None


class GenerationRequest(BaseModel):
    profile_text: str
    profile_meta: Dict[str, Any] = Field(default_factory=dict)
    job_text: str
    job_meta: Dict[str, Any] = Field(default_factory=dict)
    template: str = "corporate"
    photo_data_url: Optional[str] = None


class GenerationPatch(BaseModel):
    cv: Optional[CvData] = None
    letter: Optional[LetterData] = None
    template: Optional[str] = None
    photo_data_url: Optional[str] = None

    def changes(self) -> Dict[str, Any]:
        return self.model_dump(exclude_none=True)


class Generation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title: str
    company: str
    position: str
    template: str
    profile_text: str
    profile_meta: Dict[str, Any] = Field(default_factory=dict)
    job_text: str
    job_meta: Dict[str, Any] = Field(default_factory=dict)
    cv: CvData = Field(default_factory=dict)
    letter: LetterData = Field(default_factory=dict)
    adaptations: AdaptationsData = Field(default_factory=dict)
    photo_data_url: Optional[str] = None
    created_at: str


class GenerationSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: Optional[str] = None
    title: str
    company: str
    position: str
    template: str
    created_at: str
    match_score: int = 0


class BaseProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    profile_text: str = ""
    cv: CvData = Field(default_factory=dict)
    photo_data_url: Optional[str] = None
    updated_at: str


class LlmGenerationOutput(BaseModel):
    """Structured result expected from the LLM for a full generation."""
    model_config = ConfigDict(extra="ignore")
    cv: CvData = Field(default_factory=dict)
    letter: LetterData = Field(default_factory=dict)
    adaptations: AdaptationsData = Field(default_factory=dict)


class ExportedDocument(BaseModel):
    content: bytes
    filename: str
    media_type: str


class OwnerScope(BaseModel):
    """Which documents a user may see: everything (admin) or only their own."""
    user_id: str
    all_users: bool = False

    @property
    def owner_id(self) -> Optional[str]:
        return None if self.all_users else self.user_id

    @classmethod
    def for_user(cls, user: User) -> "OwnerScope":
        return cls(user_id=user.user_id, all_users=user.is_admin)


SUPPORTED_UPLOAD_EXTENSIONS: List[str] = [".pdf", ".docx", ".txt"]
