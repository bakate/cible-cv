"""Thin FastAPI routers — translate HTTP <-> use cases. No business logic here."""
from typing import Optional

from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    File,
    Header,
    Query,
    Response,
    UploadFile,
)

from app.container import Container
from app.domain.models import GenerationPatch, GenerationRequest, OwnerScope, User
from app.domain.rules import SESSION_TTL_DAYS

from .deps import SESSION_COOKIE, get_container, get_current_user, get_scope
from .schemas import (
    AtsCheckBody,
    BaseProfileBody,
    GenerateBody,
    GenerationPatchBody,
    RegroupSkillsBody,
    UrlPayload,
    UserResponse,
)

router = APIRouter(prefix="/api")


def _user_response(user: User) -> UserResponse:
    return UserResponse(user_id=user.user_id, email=user.email, name=user.name, picture=user.picture, role=user.role)


@router.get("/")
async def root():
    return {"app": "Cible CV", "status": "ok"}


# ---------- Auth ----------
@router.post("/auth/process-session", response_model=UserResponse)
async def auth_process_session(
    response: Response,
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-ID"),
    c: Container = Depends(get_container),
):
    auth = await c.process_oauth_session.execute(x_session_id)
    response.set_cookie(
        key=SESSION_COOKIE, value=auth.session_token, max_age=SESSION_TTL_DAYS * 24 * 3600,
        httponly=True, secure=True, samesite="none", path="/",
    )
    return _user_response(auth.user)


@router.get("/auth/me", response_model=UserResponse)
async def auth_me(user: User = Depends(get_current_user)):
    return _user_response(user)


@router.post("/auth/logout")
async def auth_logout(
    response: Response,
    session_token: Optional[str] = Cookie(default=None),
    c: Container = Depends(get_container),
):
    await c.logout.execute(session_token)
    response.delete_cookie(SESSION_COOKIE, path="/", samesite="none", secure=True)
    return {"ok": True}


# ---------- Parsing ----------
@router.post("/parse/pdf")
async def parse_pdf(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
    c: Container = Depends(get_container),
):
    text = c.extract_document_text.execute(file.filename or "", await file.read())
    return {"text": text, "filename": file.filename}


@router.post("/parse/url")
async def parse_url(
    payload: UrlPayload,
    _: User = Depends(get_current_user),
    c: Container = Depends(get_container),
):
    return {"text": c.extract_url_text.execute(payload.url), "url": payload.url.strip()}


# ---------- Generations ----------
@router.post("/generate")
async def generate(body: GenerateBody, scope: OwnerScope = Depends(get_scope), c: Container = Depends(get_container)):
    req = GenerationRequest(
        profile_text=body.profile_text,
        profile_meta=body.profile_meta or {},
        job_text=body.job_text,
        job_meta=body.job_meta or {},
        template=body.template,
        photo_data_url=body.photo_data_url,
    )
    return (await c.generate_documents.execute(req, scope)).model_dump()


@router.get("/generations")
async def list_generations(scope: OwnerScope = Depends(get_scope), c: Container = Depends(get_container)):
    return [s.model_dump() for s in await c.list_generations.execute(scope)]


@router.get("/generations/{gen_id}")
async def get_generation(gen_id: str, scope: OwnerScope = Depends(get_scope), c: Container = Depends(get_container)):
    return (await c.get_generation.execute(gen_id, scope)).model_dump()


@router.put("/generations/{gen_id}")
async def update_generation(
    gen_id: str,
    body: GenerationPatchBody,
    scope: OwnerScope = Depends(get_scope),
    c: Container = Depends(get_container),
):
    patch = GenerationPatch(**body.model_dump())
    return (await c.update_generation.execute(gen_id, patch, scope)).model_dump()


@router.delete("/generations/{gen_id}")
async def delete_generation(gen_id: str, scope: OwnerScope = Depends(get_scope), c: Container = Depends(get_container)):
    await c.delete_generation.execute(gen_id, scope)
    return {"ok": True}


# ---------- Exports ----------
async def _export(c: Container, gen_id: str, kind: str, fmt: str, scope: OwnerScope, layout: str = "single") -> Response:
    doc = await c.export_document.execute(gen_id, kind, fmt, scope, layout)
    return Response(
        content=doc.content,
        media_type=doc.media_type,
        headers={"Content-Disposition": f'attachment; filename="{doc.filename}"'},
    )


@router.get("/generations/{gen_id}/export/cv.pdf")
async def export_cv_pdf(
    gen_id: str,
    layout: str = Query(default="single"),
    scope: OwnerScope = Depends(get_scope),
    c: Container = Depends(get_container),
):
    return await _export(c, gen_id, "cv", "pdf", scope, layout)


@router.get("/generations/{gen_id}/export/cv.docx")
async def export_cv_docx(gen_id: str, scope: OwnerScope = Depends(get_scope), c: Container = Depends(get_container)):
    return await _export(c, gen_id, "cv", "docx", scope)


@router.get("/generations/{gen_id}/export/letter.pdf")
async def export_letter_pdf(gen_id: str, scope: OwnerScope = Depends(get_scope), c: Container = Depends(get_container)):
    return await _export(c, gen_id, "letter", "pdf", scope)


@router.get("/generations/{gen_id}/export/letter.docx")
async def export_letter_docx(gen_id: str, scope: OwnerScope = Depends(get_scope), c: Container = Depends(get_container)):
    return await _export(c, gen_id, "letter", "docx", scope)


# ---------- Base profile ----------
@router.get("/profile/base")
async def get_base_profile(user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    profile = await c.get_base_profile.execute(user.user_id)
    return {"exists": True, **profile.model_dump()} if profile else {"exists": False}


@router.put("/profile/base")
async def put_base_profile(
    body: BaseProfileBody,
    user: User = Depends(get_current_user),
    c: Container = Depends(get_container),
):
    profile = await c.save_base_profile.execute(user.user_id, body.model_dump())
    return {"exists": True, **profile.model_dump()}


@router.delete("/profile/base")
async def delete_base_profile(user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    await c.delete_base_profile.execute(user.user_id)
    return {"ok": True}


# ---------- Analysis ----------
@router.post("/regroup-skills")
async def regroup_skills(body: RegroupSkillsBody, _: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return await c.regroup_skills.execute(body.skills, body.tools)


@router.post("/ats-check")
async def ats_check(body: AtsCheckBody, scope: OwnerScope = Depends(get_scope), c: Container = Depends(get_container)):
    return await c.ats_check.execute(scope, body.generation_id, body.job_text or "", body.cv)
