"""Cible CV - Backend FastAPI.

Generates a tailored CV and motivation letter from a profile and a job offer
using Claude Sonnet 4.5 via the Emergent integration library.
"""
from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
from pathlib import Path
from datetime import datetime, timezone
import os
import io
import re
import json
import uuid
import logging

import requests
from bs4 import BeautifulSoup
import html2text
from pypdf import PdfReader
from docx import Document

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ciblecv")

# ---- MongoDB ----
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929"

app = FastAPI(title="Cible CV API")
api = APIRouter(prefix="/api")


# ---------- Models ----------
class GenerationCreate(BaseModel):
    profile_text: str
    profile_meta: Optional[Dict[str, Any]] = None
    job_text: str
    job_meta: Optional[Dict[str, Any]] = None
    template: str = "corporate"  # "corporate" | "startup"
    photo_data_url: Optional[str] = None


class GenerationUpdate(BaseModel):
    cv: Optional[Dict[str, Any]] = None
    letter: Optional[Dict[str, Any]] = None
    template: Optional[str] = None
    photo_data_url: Optional[str] = None


class GenerationRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    company: str
    position: str
    template: str
    profile_text: str
    profile_meta: Optional[Dict[str, Any]] = None
    job_text: str
    job_meta: Optional[Dict[str, Any]] = None
    cv: Dict[str, Any]
    letter: Dict[str, Any]
    adaptations: Dict[str, Any]
    photo_data_url: Optional[str] = None
    created_at: str


# ---------- Utilities ----------
def extract_pdf_text(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))
    parts = []
    for page in reader.pages:
        try:
            parts.append(page.extract_text() or "")
        except Exception as e:
            logger.warning("pdf page extract failed: %s", e)
    return "\n".join(parts).strip()


def extract_docx_text(content: bytes) -> str:
    doc = Document(io.BytesIO(content))
    return "\n".join(p.text for p in doc.paragraphs if p.text).strip()


def fetch_url_text(url: str) -> str:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    }
    r = requests.get(url, headers=headers, timeout=15)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")
    for tag in soup(["script", "style", "noscript", "nav", "footer", "header"]):
        tag.decompose()
    # Focus on main / article when available
    main = soup.find("main") or soup.find("article") or soup.body or soup
    h = html2text.HTML2Text()
    h.ignore_links = True
    h.ignore_images = True
    h.body_width = 0
    text = h.handle(str(main))
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text[:20000]


def _extract_json(raw: str) -> Dict[str, Any]:
    """Pull the first JSON object/array out of an LLM response."""
    fenced = re.search(r"```(?:json)?\s*(.*?)```", raw, re.DOTALL)
    candidate = fenced.group(1) if fenced else raw
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in LLM response")
    return json.loads(candidate[start : end + 1])


async def claude_chat(system_prompt: str, user_text: str) -> str:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY non configurée")
    chat = (
        LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"cible-cv-{uuid.uuid4()}",
            system_message=system_prompt,
        )
        .with_model("anthropic", ANTHROPIC_MODEL)
        .with_params(max_tokens=8000)
    )
    response = await chat.send_message(UserMessage(text=user_text))
    return response if isinstance(response, str) else str(response)


# ---------- Routes ----------
@api.get("/")
async def root():
    return {"app": "Cible CV", "status": "ok"}


@api.post("/parse/pdf")
async def parse_pdf(file: UploadFile = File(...)):
    content = await file.read()
    name = (file.filename or "").lower()
    try:
        if name.endswith(".pdf"):
            text = extract_pdf_text(content)
        elif name.endswith(".docx"):
            text = extract_docx_text(content)
        elif name.endswith(".txt"):
            text = content.decode("utf-8", errors="ignore")
        else:
            raise HTTPException(status_code=400, detail="Format non supporté (PDF, DOCX, TXT)")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("parse failed")
        raise HTTPException(status_code=400, detail=f"Lecture du fichier impossible: {e}")
    if not text:
        raise HTTPException(status_code=400, detail="Le document est vide ou non lisible.")
    return {"text": text, "filename": file.filename}


@api.post("/parse/url")
async def parse_url(payload: Dict[str, str]):
    url = (payload.get("url") or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL requise")
    try:
        text = fetch_url_text(url)
    except Exception as e:
        logger.warning("URL fetch failed for %s: %s", url, e)
        raise HTTPException(
            status_code=400,
            detail="Impossible de récupérer cette URL automatiquement. Collez le contenu à la main.",
        )
    if not text or len(text) < 80:
        raise HTTPException(
            status_code=400,
            detail="Contenu insuffisant à cette URL. Collez le texte de l'annonce manuellement.",
        )
    return {"text": text, "url": url}


SYSTEM_PROMPT = """Tu es un expert RH et coach carrière francophone. Tu produis des CV et lettres de motivation en français, percutants, professionnels et rigoureusement honnêtes.

RÈGLES CRITIQUES:
1. N'invente JAMAIS d'expérience, de diplôme, de compétence ou de chiffre.
2. Si une information manque, reste sobre, ne comble pas avec du fictif.
3. Adapte le vocabulaire au champ lexical de l'annonce, sans mentir.
4. Réorganise et reformule pour mettre en avant ce qui matche l'offre.
5. La lettre doit être naturelle, crédible, sans formules clichées creuses.
6. Réponds STRICTEMENT en JSON valide, sans texte avant/après, sans markdown.
"""


GENERATION_TEMPLATE = """Voici le PROFIL CANDIDAT (extrait brut du CV / LinkedIn / saisie manuelle):
---
{profile}
---

Voici l'OFFRE D'EMPLOI cible:
---
{job}
---

Génère un objet JSON structuré exactement comme suit:

{{
  "cv": {{
    "full_name": "string",
    "headline": "intitulé court adapté au poste",
    "contact": {{
      "email": "string ou null",
      "phone": "string ou null",
      "location": "string ou null",
      "linkedin": "string ou null",
      "github": "string ou null",
      "website": "string ou null"
    }},
    "summary": "résumé pro 3-4 lignes orienté annonce",
    "skills": ["compétence", "..."],
    "languages": [{{"name": "Français", "level": "Natif"}}],
    "experiences": [
      {{
        "title": "poste",
        "company": "entreprise",
        "location": "ville",
        "start": "MM/YYYY",
        "end": "MM/YYYY ou Présent",
        "bullets": ["réalisation orientée résultats", "..."]
      }}
    ],
    "education": [
      {{"degree": "diplôme", "school": "école", "start": "YYYY", "end": "YYYY", "details": "string ou null"}}
    ],
    "certifications": [{{"name": "string", "issuer": "string", "year": "YYYY"}}],
    "tools": ["outil", "..."],
    "interests": ["centre d'intérêt", "..."]
  }},
  "letter": {{
    "recipient": "Madame, Monsieur,",
    "subject": "Candidature au poste de ...",
    "body": "Lettre complète en 3-4 paragraphes naturels, en français. Personnalisée à l'entreprise et au poste. Pas de répétition mot pour mot du CV. Termine par une formule de politesse simple."
  }},
  "adaptations": {{
    "position": "poste détecté",
    "company": "entreprise détectée",
    "keywords_matched": ["mot-clé présent chez le candidat ET dans l'offre"],
    "keywords_added": ["mot-clé reformulé / mis en avant"],
    "experiences_highlighted": ["expérience mise en avant et pourquoi"],
    "match_score": 0
  }}
}}

Le match_score est un entier de 0 à 100 reflétant la correspondance globale.
RAPPEL: Reste fidèle au parcours réel du candidat. Sors UNIQUEMENT le JSON.
"""


@api.post("/generate")
async def generate(req: GenerationCreate):
    if not req.profile_text or len(req.profile_text) < 50:
        raise HTTPException(status_code=400, detail="Profil insuffisant pour générer.")
    if not req.job_text or len(req.job_text) < 50:
        raise HTTPException(status_code=400, detail="Offre d'emploi insuffisante.")
    prompt = GENERATION_TEMPLATE.format(
        profile=req.profile_text[:14000],
        job=req.job_text[:8000],
    )
    try:
        raw = await claude_chat(SYSTEM_PROMPT, prompt)
        data = _extract_json(raw)
    except Exception as e:
        logger.exception("LLM generation failed")
        raise HTTPException(status_code=502, detail=f"Échec de la génération: {e}")

    cv = data.get("cv") or {}
    letter = data.get("letter") or {}
    adaptations = data.get("adaptations") or {}

    rec_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    company = adaptations.get("company") or (req.job_meta or {}).get("company") or "Entreprise"
    position = adaptations.get("position") or "Poste"
    title = f"{position} — {company}"

    doc = {
        "id": rec_id,
        "title": title,
        "company": company,
        "position": position,
        "template": req.template,
        "profile_text": req.profile_text,
        "profile_meta": req.profile_meta or {},
        "job_text": req.job_text,
        "job_meta": req.job_meta or {},
        "cv": cv,
        "letter": letter,
        "adaptations": adaptations,
        "photo_data_url": req.photo_data_url,
        "created_at": now_iso,
    }
    await db.generations.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/generations")
async def list_generations():
    cursor = db.generations.find(
        {},
        {
            "_id": 0,
            "id": 1,
            "title": 1,
            "company": 1,
            "position": 1,
            "template": 1,
            "created_at": 1,
            "adaptations": 1,
        },
    ).sort("created_at", -1).limit(200)
    items = await cursor.to_list(200)
    for it in items:
        adp = it.pop("adaptations", {}) or {}
        it["match_score"] = adp.get("match_score", 0)
    return items


@api.get("/generations/{gen_id}")
async def get_generation(gen_id: str):
    doc = await db.generations.find_one({"id": gen_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Génération introuvable")
    return doc


@api.put("/generations/{gen_id}")
async def update_generation(gen_id: str, update: GenerationUpdate):
    patch = {k: v for k, v in update.model_dump(exclude_none=True).items()}
    if not patch:
        raise HTTPException(status_code=400, detail="Rien à mettre à jour")
    result = await db.generations.update_one({"id": gen_id}, {"$set": patch})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Génération introuvable")
    doc = await db.generations.find_one({"id": gen_id}, {"_id": 0})
    return doc


@api.delete("/generations/{gen_id}")
async def delete_generation(gen_id: str):
    result = await db.generations.delete_one({"id": gen_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Génération introuvable")
    return {"ok": True}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    mongo_client.close()
