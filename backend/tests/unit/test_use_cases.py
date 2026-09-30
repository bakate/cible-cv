"""Use-case tests with in-memory fakes. Run: cd backend && pytest tests/unit -q"""
import asyncio
from datetime import timedelta

import pytest

from app.application.use_cases.analysis import AtsCheck, RegroupSkills
from app.application.use_cases.auth import AuthenticateSession, Logout, ProcessOAuthSession
from app.application.use_cases.exports import ExportDocument
from app.application.use_cases.generation import (
    DeleteGeneration,
    GenerateDocuments,
    GetGeneration,
    ListGenerations,
    UpdateGeneration,
)
from app.application.use_cases.parsing import ExtractDocumentText, ExtractUrlText
from app.application.use_cases.profile import SaveBaseProfile
from app.domain.errors import AuthenticationError, NotFoundError, UpstreamError, ValidationError
from app.domain.models import GenerationPatch, GenerationRequest, OAuthProfile, OwnerScope, Session
from app.domain.rules import build_generation_title, decide_role, export_filename, extract_json_object

from .fakes import (
    FakeBaseProfiles,
    FakeClock,
    FakeExtractor,
    FakeFetcher,
    FakeGenerations,
    FakeOAuth,
    FakeRenderer,
    FakeSessions,
    FakeUsers,
    ScriptedLlm,
    SequenceIds,
    make_generation,
    make_user,
    summaries_ids,
)

run = asyncio.run
USER = OwnerScope.for_user(make_user("u1"))
OTHER = OwnerScope.for_user(make_user("u2"))
ADMIN = OwnerScope.for_user(make_user("boss", role="admin"))

LLM_OUTPUT = {
    "cv": {"full_name": "Jane Doe", "skills": ["Python"]},
    "letter": {"body": "Madame, Monsieur, ..."},
    "adaptations": {"position": "Lead Dev", "company": "Acme", "match_score": 88},
}


# ---------- domain rules ----------
def test_decide_role_first_user_is_admin():
    assert decide_role("a@x.io", "", 0) == "admin"
    assert decide_role("a@x.io", "", 1) == "user"
    assert decide_role("boss@x.io", "boss@x.io", 5) == "admin"


def test_build_title_falls_back_on_job_meta_then_defaults():
    assert build_generation_title({"position": "Dev"}, {"company": "Acme"})["title"] == "Dev — Acme"
    assert build_generation_title({}, {})["title"] == "Poste — Entreprise"


def test_extract_json_handles_fences_and_noise():
    assert extract_json_object('bla ```json\n{"a": 1}\n``` fin') == {"a": 1}
    with pytest.raises(ValueError):
        extract_json_object("pas de json")


def test_export_filename_is_safe():
    assert export_filename("cv", {"full_name": "Jé Dôe/1"}, "Acme & Co", "pdf") == "CV-J_D_e_1-Acme_Co.pdf"
    assert export_filename("letter", {}, "", "docx") == "Lettre-candidat-candidat.docx"


# ---------- generation ----------
def _generate_uc(llm=None, repo=None):
    return GenerateDocuments(llm or ScriptedLlm(LLM_OUTPUT), repo or FakeGenerations(), FakeClock(), SequenceIds())


def test_generate_rejects_short_inputs_without_calling_llm():
    llm = ScriptedLlm(LLM_OUTPUT)
    with pytest.raises(ValidationError):
        run(_generate_uc(llm).execute(GenerationRequest(profile_text="court", job_text="x" * 60), USER))
    assert llm.calls == []


def test_generate_persists_and_names_from_llm_adaptations():
    repo = FakeGenerations()
    gen = run(_generate_uc(repo=repo).execute(GenerationRequest(profile_text="p" * 60, job_text="j" * 60, template="startup"), USER))
    assert gen.title == "Lead Dev — Acme" and gen.user_id == "u1" and gen.template == "startup"
    assert gen.cv["full_name"] == "Jane Doe" and gen.adaptations["match_score"] == 88
    assert repo.items[gen.id] == gen
    assert gen.created_at.startswith("2026-06-01T12:00")


def test_generate_wraps_llm_failure_as_upstream_error():
    with pytest.raises(UpstreamError):
        run(_generate_uc(ScriptedLlm({}, fail=True)).execute(GenerationRequest(profile_text="p" * 60, job_text="j" * 60), USER))


def test_scope_isolates_users_but_admin_sees_all():
    repo = FakeGenerations()
    run(repo.insert(make_generation("g1", "u1")))
    run(repo.insert(make_generation("g2", "u2", created_at="2026-05-02T00:00:00+00:00")))
    assert summaries_ids(run(ListGenerations(repo).execute(USER))) == ["g1"]
    assert summaries_ids(run(ListGenerations(repo).execute(ADMIN))) == ["g2", "g1"]
    assert run(ListGenerations(repo).execute(ADMIN))[0].match_score == 77
    with pytest.raises(NotFoundError):
        run(GetGeneration(repo).execute("g1", OTHER))
    assert run(GetGeneration(repo).execute("g1", ADMIN)).id == "g1"


def test_update_requires_changes_and_ownership():
    repo = FakeGenerations()
    run(repo.insert(make_generation("g1", "u1")))
    with pytest.raises(ValidationError):
        run(UpdateGeneration(repo).execute("g1", GenerationPatch(), USER))
    with pytest.raises(NotFoundError):
        run(UpdateGeneration(repo).execute("g1", GenerationPatch(template="startup"), OTHER))
    updated = run(UpdateGeneration(repo).execute("g1", GenerationPatch(template="startup"), USER))
    assert updated.template == "startup" and updated.cv == {"full_name": "Jane Doe"}


def test_delete_ownership():
    repo = FakeGenerations()
    run(repo.insert(make_generation("g1", "u1")))
    with pytest.raises(NotFoundError):
        run(DeleteGeneration(repo).execute("g1", OTHER))
    run(DeleteGeneration(repo).execute("g1", USER))
    assert repo.items == {}


# ---------- exports ----------
def test_export_dispatches_kind_format_and_layout():
    repo = FakeGenerations()
    run(repo.insert(make_generation("g1", "u1")))
    uc = ExportDocument(repo, FakeRenderer())
    doc = run(uc.execute("g1", "cv", "pdf", USER, layout="two-col"))
    assert doc.content == b"PDF:two-col" and doc.filename == "CV-Jane_Doe-Acme.pdf" and doc.media_type == "application/pdf"
    assert run(uc.execute("g1", "cv", "pdf", USER, layout="weird")).content == b"PDF:single"
    assert run(uc.execute("g1", "letter", "docx", USER)).filename == "Lettre-Jane_Doe-Acme.docx"
    with pytest.raises(ValidationError):
        run(uc.execute("g1", "cv", "odt", USER))
    with pytest.raises(NotFoundError):
        run(uc.execute("g1", "cv", "pdf", OTHER))


# ---------- parsing ----------
def test_extract_document_text_rules():
    with pytest.raises(ValidationError, match="Format non supporté"):
        ExtractDocumentText(FakeExtractor("x")).execute("cv.xyz", b"")
    with pytest.raises(ValidationError, match="vide"):
        ExtractDocumentText(FakeExtractor("")).execute("cv.pdf", b"")
    with pytest.raises(ValidationError, match="impossible"):
        ExtractDocumentText(FakeExtractor(fail=True)).execute("cv.pdf", b"")
    assert ExtractDocumentText(FakeExtractor("hello")).execute("CV.PDF", b"") == "hello"


def test_extract_url_text_rules():
    with pytest.raises(ValidationError, match="URL requise"):
        ExtractUrlText(FakeFetcher("x" * 100)).execute("  ")
    with pytest.raises(ValidationError, match="Collez le contenu"):
        ExtractUrlText(FakeFetcher(fail=True)).execute("https://a.b")
    with pytest.raises(ValidationError, match="insuffisant"):
        ExtractUrlText(FakeFetcher("court")).execute("https://a.b")
    assert ExtractUrlText(FakeFetcher("x" * 100)).execute("https://a.b") == "x" * 100


# ---------- auth ----------
def _auth_env(admin_email=""):
    users, sessions, gens, profiles = FakeUsers(), FakeSessions(), FakeGenerations(), FakeBaseProfiles()
    clock = FakeClock()
    return users, sessions, gens, clock, ProcessOAuthSession(
        FakeOAuth(OAuthProfile(email="Jane@X.io", name="Jane", picture="pic", session_token="tok-1")),
        users, sessions, gens, profiles, clock, SequenceIds(), admin_email,
    )


def test_first_oauth_user_becomes_admin_and_claims_orphans():
    users, sessions, gens, clock, uc = _auth_env()
    auth = run(uc.execute("sess"))
    assert auth.user.role == "admin" and auth.user.email == "jane@x.io" and auth.session_token == "tok-1"
    assert gens.claimed_by == auth.user.user_id
    assert sessions.items["tok-1"].expires_at == clock.now() + timedelta(days=7)


def test_second_oauth_user_is_plain_user_and_relogin_refreshes_profile():
    users, sessions, gens, clock, uc = _auth_env()
    first = run(uc.execute("sess"))
    uc.oauth.profile = OAuthProfile(email="bob@x.io", name="Bob", session_token="tok-2")
    assert run(uc.execute("sess")).user.role == "user"
    uc.oauth.profile = OAuthProfile(email="jane@x.io", name="Jane D.", session_token="tok-3")
    again = run(uc.execute("sess"))
    assert again.user.user_id == first.user.user_id and again.user.name == "Jane D." and again.user.picture == "pic"
    assert len(users.items) == 2


def test_oauth_errors():
    users, sessions, gens, clock, uc = _auth_env()
    with pytest.raises(ValidationError):
        run(uc.execute(None))
    uc.oauth.fail = True
    with pytest.raises(UpstreamError):
        run(uc.execute("sess"))


def test_authenticate_session_expiry_and_logout():
    users, sessions, clock = FakeUsers(), FakeSessions(), FakeClock()
    run(users.insert(make_user("u1")))
    run(sessions.insert(Session(user_id="u1", session_token="ok", expires_at=clock.now() + timedelta(days=1), created_at=clock.now())))
    run(sessions.insert(Session(user_id="u1", session_token="old", expires_at=clock.now() - timedelta(days=1), created_at=clock.now())))
    uc = AuthenticateSession(sessions, users, clock)
    assert run(uc.execute("ok")).user_id == "u1"
    for bad in (None, "unknown", "old"):
        with pytest.raises(AuthenticationError):
            run(uc.execute(bad))
    run(Logout(sessions).execute("ok"))
    with pytest.raises(AuthenticationError):
        run(uc.execute("ok"))


# ---------- analysis / profile ----------
def test_regroup_skills_requires_input_and_returns_llm_json():
    with pytest.raises(ValidationError):
        run(RegroupSkills(ScriptedLlm({})).execute([], []))
    out = run(RegroupSkills(ScriptedLlm({"skill_groups": [{"category": "Backend", "items": ["Python"]}]})).execute(["Python"], []))
    assert out["skill_groups"][0]["category"] == "Backend"


def test_ats_check_uses_stored_generation_within_scope():
    repo = FakeGenerations()
    run(repo.insert(make_generation("g1", "u1", job_text="Offre Python FastAPI " * 5, cv={"full_name": "Jane", "skills": ["Python"]})))
    llm = ScriptedLlm({"score": 80, "verdict": "bon"})
    assert run(AtsCheck(llm, repo).execute(USER, generation_id="g1"))["score"] == 80
    assert "Offre Python" in llm.calls[0][1] and "Compétences: Python" in llm.calls[0][1]
    with pytest.raises(NotFoundError):
        run(AtsCheck(llm, repo).execute(OTHER, generation_id="g1"))
    with pytest.raises(ValidationError):
        run(AtsCheck(llm, repo).execute(USER, job_text="", cv={}))


def test_save_base_profile_stamps_time():
    profiles = FakeBaseProfiles()
    saved = run(SaveBaseProfile(profiles, FakeClock()).execute("u1", {"profile_text": "txt", "cv": None}))
    assert saved.cv == {} and saved.updated_at.startswith("2026-06-01") and profiles.items["u1"] == saved
