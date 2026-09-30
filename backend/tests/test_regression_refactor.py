"""Backend regression tests after hexagonal + XState refactor.
Uses admin session token 'admin-session-refactor' (see /app/memory/test_credentials.md).
"""
import io
import os
import pytest
import requests
from reportlab.pdfgen import canvas

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cv-matcher-41.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
TOKEN = "admin-session-refactor"
AUTH = {"Authorization": f"Bearer {TOKEN}"}
EXISTING_GEN_ID = "667070ff-8685-4f61-aceb-b5a012782f66"

state = {}


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update(AUTH)
    return sess


def _pdf(text="Profil test refactor.") -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(100, 750, text)
    c.showPage()
    c.save()
    return buf.getvalue()


# ---------- Health & Auth ----------
class TestHealthAuth:
    def test_health(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["app"] == "Cible CV" and d["status"] == "ok"

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401
        assert "detail" in r.json()

    def test_generations_unauth(self):
        r = requests.get(f"{API}/generations", timeout=15)
        assert r.status_code == 401

    def test_profile_base_unauth(self):
        r = requests.get(f"{API}/profile/base", timeout=15)
        assert r.status_code == 401

    def test_me_authed(self, s):
        r = s.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "admin"
        assert d["email"] == "admin.test@example.com"


# ---------- Existing generation reads ----------
class TestExistingGen:
    def test_list(self, s):
        r = s.get(f"{API}/generations", timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 1
        for it in items:
            assert "_id" not in it
            assert "match_score" in it

    def test_get_existing(self, s):
        r = s.get(f"{API}/generations/{EXISTING_GEN_ID}", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == EXISTING_GEN_ID
        assert "cv" in d and "letter" in d and "adaptations" in d
        assert "_id" not in d

    def test_get_unknown(self, s):
        r = s.get(f"{API}/generations/unknown-xyz", timeout=15)
        assert r.status_code == 404

    def test_update_empty(self, s):
        r = s.put(f"{API}/generations/{EXISTING_GEN_ID}", json={}, timeout=15)
        assert r.status_code == 400
        assert "Rien" in r.json().get("detail", "") or "mettre" in r.json().get("detail", "")

    def test_update_template_roundtrip(self, s):
        r = s.put(f"{API}/generations/{EXISTING_GEN_ID}", json={"template": "startup"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["template"] == "startup"
        r2 = s.get(f"{API}/generations/{EXISTING_GEN_ID}", timeout=15)
        assert r2.json()["template"] == "startup"
        # restore
        r3 = s.put(f"{API}/generations/{EXISTING_GEN_ID}", json={"template": "corporate"}, timeout=30)
        assert r3.status_code == 200
        assert r3.json()["template"] == "corporate"


# ---------- Parsing ----------
class TestParsing:
    def test_url_empty(self, s):
        r = s.post(f"{API}/parse/url", json={"url": ""}, timeout=15)
        assert r.status_code == 400

    def test_url_ok(self, s):
        r = s.post(f"{API}/parse/url", json={"url": "https://www.iana.org/help/example-domains"}, timeout=30)
        assert r.status_code == 200
        assert len(r.json()["text"]) > 80

    def test_pdf_ok(self, s):
        files = {"file": ("cv.pdf", _pdf("Jean Test Refactor."), "application/pdf")}
        r = s.post(f"{API}/parse/pdf", files=files, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "Jean" in d["text"] or "Test" in d["text"]
        assert d["filename"] == "cv.pdf"

    def test_pdf_unsupported(self, s):
        files = {"file": ("x.xyz", b"hello", "application/octet-stream")}
        r = s.post(f"{API}/parse/pdf", files=files, timeout=15)
        assert r.status_code == 400


# ---------- Exports on existing id ----------
class TestExports:
    def _check(self, r, media, min_size=10_000):
        assert r.status_code == 200, r.text[:200]
        assert media in r.headers.get("content-type", "")
        assert "attachment" in r.headers.get("content-disposition", "").lower()
        assert len(r.content) > min_size

    def test_cv_pdf_single(self, s):
        r = s.get(f"{API}/generations/{EXISTING_GEN_ID}/export/cv.pdf?layout=single", timeout=60)
        self._check(r, "application/pdf")

    def test_cv_pdf_twocol(self, s):
        r = s.get(f"{API}/generations/{EXISTING_GEN_ID}/export/cv.pdf?layout=two-col", timeout=60)
        self._check(r, "application/pdf")

    def test_cv_docx(self, s):
        r = s.get(f"{API}/generations/{EXISTING_GEN_ID}/export/cv.docx", timeout=60)
        self._check(r, "officedocument.wordprocessingml", min_size=2000)

    def test_letter_pdf(self, s):
        r = s.get(f"{API}/generations/{EXISTING_GEN_ID}/export/letter.pdf", timeout=60)
        self._check(r, "application/pdf", min_size=2000)

    def test_letter_docx(self, s):
        r = s.get(f"{API}/generations/{EXISTING_GEN_ID}/export/letter.docx", timeout=60)
        self._check(r, "officedocument.wordprocessingml", min_size=2000)


# ---------- Base profile lifecycle ----------
class TestBaseProfile:
    def test_lifecycle(self, s):
        r = s.put(
            f"{API}/profile/base",
            json={"profile_text": "abcdef test", "cv": {"full_name": "X User"}},
            timeout=30,
        )
        assert r.status_code == 200
        assert r.json()["exists"] is True

        g = s.get(f"{API}/profile/base", timeout=15)
        assert g.status_code == 200 and g.json()["exists"] is True

        d = s.delete(f"{API}/profile/base", timeout=15)
        assert d.status_code == 200 and d.json().get("ok") is True

        g2 = s.get(f"{API}/profile/base", timeout=15)
        assert g2.status_code == 200 and g2.json()["exists"] is False


# ---------- Regroup skills + ATS ----------
class TestAnalysis:
    def test_regroup_empty(self, s):
        r = s.post(f"{API}/regroup-skills", json={"skills": [], "tools": []}, timeout=15)
        assert r.status_code == 400

    def test_regroup_ok(self, s):
        r = s.post(
            f"{API}/regroup-skills",
            json={"skills": ["Python", "React"], "tools": ["Docker"]},
            timeout=60,
        )
        assert r.status_code == 200, r.text[:200]
        assert "skill_groups" in r.json()

    def test_ats_empty(self, s):
        r = s.post(f"{API}/ats-check", json={}, timeout=15)
        assert r.status_code == 400

    def test_ats_ok(self, s):
        r = s.post(f"{API}/ats-check", json={"generation_id": EXISTING_GEN_ID}, timeout=60)
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        assert "score" in d and "verdict" in d


# ---------- Full generate + CRUD lifecycle ----------
PROFILE_FR = (
    "Marie Test, ingenieure logiciel senior basee a Paris, 8 ans d'experience en developpement "
    "web full-stack. Expertise Python, FastAPI, React, TypeScript, PostgreSQL, Docker, AWS. "
    "Chez Acme Tech (2020-present), refonte SaaS B2B 50k users. Master Info Paris-Saclay 2017. "
    "Anglais courant. Email: marie.test@example.com."
)
JOB_FR = (
    "Recherche Lead Developpeur Backend Python a Paris. Responsabilites: architecture SaaS, "
    "mentorat 4-6 ingenieurs, DevOps. Stack: Python, FastAPI, PostgreSQL, AWS, Docker, K8s. "
    "6+ ans backend Python, leadership, anglais pro. Bonus: open-source. CDI 75-95k."
)


class TestGenerateLifecycle:
    def test_generate_short(self, s):
        r = s.post(f"{API}/generate", json={"profile_text": "x", "job_text": "y"}, timeout=15)
        assert r.status_code == 400

    def test_generate_full(self, s):
        r = s.post(
            f"{API}/generate",
            json={"profile_text": PROFILE_FR, "job_text": JOB_FR, "template": "corporate"},
            timeout=180,
        )
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert "id" in d and len(d["id"]) >= 32
        assert d["cv"].get("full_name")
        assert len(d["letter"].get("body", "")) > 50
        assert "match_score" in d["adaptations"]
        assert "_id" not in d
        state["gid"] = d["id"]

    def test_get_new(self, s):
        r = s.get(f"{API}/generations/{state['gid']}", timeout=30)
        assert r.status_code == 200

    def test_put_new(self, s):
        r = s.put(f"{API}/generations/{state['gid']}", json={"template": "startup"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["template"] == "startup"

    def test_delete_new(self, s):
        r = s.delete(f"{API}/generations/{state['gid']}", timeout=15)
        assert r.status_code == 200 and r.json().get("ok") is True
        r2 = s.get(f"{API}/generations/{state['gid']}", timeout=15)
        assert r2.status_code == 404
