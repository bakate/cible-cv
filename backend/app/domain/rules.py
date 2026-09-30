"""Pure business rules. No I/O, no framework."""
import json
import re
from typing import Any, Dict, List, Optional

from .errors import ValidationError
from .models import CvData, OAuthProfile

MIN_PROFILE_CHARS = 50
MIN_JOB_CHARS = 50
MIN_URL_CONTENT_CHARS = 80
MAX_PROFILE_CHARS_FOR_LLM = 14000
MAX_JOB_CHARS_FOR_LLM = 8000
MAX_ATS_SECTION_CHARS = 6000
SESSION_TTL_DAYS = 7
DEFAULT_ACCENT = "#FF3E1A"
DEFAULT_TEMPLATE = "corporate"
TEMPLATES = ("corporate", "startup")
PDF_LAYOUTS = ("single", "two-col")


def validate_generation_inputs(profile_text: str, job_text: str) -> None:
    if not profile_text or len(profile_text) < MIN_PROFILE_CHARS:
        raise ValidationError("Profil insuffisant pour générer.")
    if not job_text or len(job_text) < MIN_JOB_CHARS:
        raise ValidationError("Offre d'emploi insuffisante.")


def validate_url_content(text: str) -> None:
    if not text or len(text) < MIN_URL_CONTENT_CHARS:
        raise ValidationError("Contenu insuffisant à cette URL. Collez le texte de l'annonce manuellement.")


def normalize_layout(layout: Optional[str]) -> str:
    return layout if layout in PDF_LAYOUTS else "single"


def build_generation_title(adaptations: Dict[str, Any], job_meta: Dict[str, Any]) -> Dict[str, str]:
    company = adaptations.get("company") or job_meta.get("company") or "Entreprise"
    position = adaptations.get("position") or "Poste"
    return {"company": company, "position": position, "title": f"{position} — {company}"}


def decide_role(email: str, admin_email: str, admin_count: int) -> str:
    """First user ever, or the configured ADMIN_EMAIL, becomes admin."""
    if admin_email and email == admin_email:
        return "admin"
    return "admin" if admin_count == 0 else "user"


def normalize_oauth_profile(profile: OAuthProfile) -> OAuthProfile:
    email = (profile.email or "").strip().lower()
    if not email:
        raise ValidationError("Email manquant dans le profil OAuth")
    return profile.model_copy(update={"email": email, "name": profile.name or email.split("@")[0]})


def accent_of(cv: CvData) -> str:
    return ((cv.get("theme") or {}).get("accent")) or DEFAULT_ACCENT


def safe_filename_part(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_\-]+", "_", name or "candidat").strip("_") or "candidat"


def export_filename(kind: str, cv: CvData, company: str, ext: str) -> str:
    prefix = "CV" if kind == "cv" else "Lettre"
    return f"{prefix}-{safe_filename_part(cv.get('full_name', ''))}-{safe_filename_part(company)}.{ext}"


def extract_json_object(raw: str) -> Dict[str, Any]:
    """Pull the first JSON object out of an LLM response (tolerates ``` fences)."""
    fenced = re.search(r"```(?:json)?\s*(.*?)```", raw, re.DOTALL)
    candidate = fenced.group(1) if fenced else raw
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in LLM response")
    return json.loads(candidate[start : end + 1])


def cv_to_plain_text(cv: CvData) -> str:
    """Flatten a structured CV into text for LLM analysis (ATS audit)."""
    parts: List[str] = []
    if cv.get("full_name"):
        parts.append(f"Nom: {cv['full_name']}")
    if cv.get("headline"):
        parts.append(f"Titre: {cv['headline']}")
    if cv.get("summary"):
        parts.append(f"Profil: {cv['summary']}")
    if cv.get("experiences"):
        parts.append("Expériences:")
        for e in cv["experiences"]:
            bullets = "; ".join(e.get("bullets") or [])
            parts.append(
                f"- {e.get('title', '')} chez {e.get('company', '')} "
                f"({e.get('start', '')}–{e.get('end', '')}): {bullets}"
            )
    if cv.get("education"):
        parts.append("Formation:")
        for ed in cv["education"]:
            parts.append(f"- {ed.get('degree', '')} – {ed.get('school', '')}")
    if cv.get("skill_groups"):
        parts.append("Compétences (par famille):")
        for g in cv["skill_groups"]:
            parts.append(f"- {g.get('category', '')}: {', '.join(g.get('items') or [])}")
    elif cv.get("skills"):
        parts.append(f"Compétences: {', '.join(cv['skills'])}")
    if cv.get("tools"):
        parts.append(f"Outils: {', '.join(cv['tools'])}")
    if cv.get("languages"):
        langs = ", ".join(
            f"{lang.get('name', '')} ({lang.get('level', '')})"
            for lang in cv["languages"]
            if lang.get("name")
        )
        parts.append(f"Langues: {langs}")
    return "\n".join(parts)
