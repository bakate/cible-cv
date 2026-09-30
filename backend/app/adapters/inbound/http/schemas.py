"""HTTP request/response schemas (transport layer only)."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class UrlPayload(BaseModel):
    url: str = ""


class GenerateBody(BaseModel):
    profile_text: str
    profile_meta: Optional[Dict[str, Any]] = None
    job_text: str
    job_meta: Optional[Dict[str, Any]] = None
    template: str = "corporate"
    photo_data_url: Optional[str] = None


class GenerationPatchBody(BaseModel):
    cv: Optional[Dict[str, Any]] = None
    letter: Optional[Dict[str, Any]] = None
    template: Optional[str] = None
    photo_data_url: Optional[str] = None


class BaseProfileBody(BaseModel):
    profile_text: str = ""
    cv: Optional[Dict[str, Any]] = None
    photo_data_url: Optional[str] = None


class RegroupSkillsBody(BaseModel):
    skills: List[str] = Field(default_factory=list)
    tools: List[str] = Field(default_factory=list)


class AtsCheckBody(BaseModel):
    generation_id: Optional[str] = None
    job_text: Optional[str] = None
    cv: Optional[Dict[str, Any]] = None


class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str
