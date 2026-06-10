"""Backend tests for Cible CV API."""
import io
import os
import pytest
import requests
from reportlab.pdfgen import canvas

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cv-matcher-41.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Shared state across tests
state = {}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    return s


def _make_pdf_bytes(text: str = "Profil candidat test. Ingenieur logiciel Python.") -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(100, 750, text)
    c.showPage()
    c.save()
    return buf.getvalue()


# --- Health ---
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        assert data.get("app") == "Cible CV"


# --- Parse URL ---
class TestParseUrl:
    def test_parse_url_example(self, session):
        r = session.post(f"{API}/parse/url", json={"url": "https://example.com"}, timeout=30)
        # example.com is short ~80 chars, may pass or fail "insufficient" check
        # accept 200 or 400 with proper message
        if r.status_code == 200:
            data = r.json()
            assert "text" in data
            assert "example" in data["text"].lower() or "domain" in data["text"].lower()
        else:
            assert r.status_code == 400

    def test_parse_url_richer(self, session):
        # Use a richer page to ensure success
        r = session.post(f"{API}/parse/url", json={"url": "https://www.iana.org/help/example-domains"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "text" in data and len(data["text"]) > 80

    def test_parse_url_empty(self, session):
        r = session.post(f"{API}/parse/url", json={"url": ""}, timeout=15)
        assert r.status_code == 400


# --- Parse PDF ---
class TestParsePdf:
    def test_parse_pdf(self, session):
        pdf_bytes = _make_pdf_bytes("Jean Dupont. Developpeur Python 5 ans. Paris.")
        files = {"file": ("cv.pdf", pdf_bytes, "application/pdf")}
        r = session.post(f"{API}/parse/pdf", files=files, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "text" in data
        assert "Jean Dupont" in data["text"] or "Dupont" in data["text"]
        assert data["filename"] == "cv.pdf"

    def test_parse_unsupported(self, session):
        files = {"file": ("file.xyz", b"hello", "application/octet-stream")}
        r = session.post(f"{API}/parse/pdf", files=files, timeout=15)
        assert r.status_code == 400


# --- Generate (LLM) and CRUD ---
PROFILE_FR = (
    "Marie Lefevre, ingenieure logiciel senior basee a Paris, 8 ans d'experience en developpement "
    "web full-stack. Expertise Python, FastAPI, React, TypeScript, PostgreSQL, MongoDB, Docker, AWS. "
    "Chez Acme Tech (2020-presente), j'ai conduit la refonte d'une plateforme SaaS B2B servant 50 000 "
    "utilisateurs, reduit les temps de reponse API de 40%, et encadre une equipe de 5 developpeurs. "
    "Auparavant chez DataCorp (2017-2020), j'ai concu des pipelines ETL traitant 2 To/jour. Diplomee "
    "d'un Master en Informatique de l'Universite Paris-Saclay (2017). Certifications AWS Solutions "
    "Architect Associate. Anglais courant, francais natif. Passionnee par l'open-source, je contribue "
    "regulierement a des projets Python. Email: marie.lefevre@example.com. LinkedIn: /in/marielefevre."
)

JOB_FR = (
    "Nous recherchons un(e) Lead Developpeur(se) Backend Python pour rejoindre notre equipe a Paris. "
    "Vous serez responsable de l'architecture de notre plateforme SaaS, du mentorat de 4-6 ingenieurs, "
    "et de la mise en place des bonnes pratiques DevOps. Stack: Python, FastAPI, PostgreSQL, AWS, "
    "Docker, Kubernetes. Profil recherche: 6+ ans d'experience en backend Python, experience confirmee "
    "en architecture microservices, leadership technique demontre, maitrise des bases de donnees "
    "relationnelles et NoSQL, anglais professionnel. Bonus: contributions open-source, AWS certifie. "
    "Notre entreprise StartupX developpe une solution SaaS innovante pour la gestion de talents. "
    "CDI, remote partiel, salaire 75-95k EUR selon profil. Postuler avec CV et lettre de motivation."
)


class TestGenerateAndCRUD:
    def test_generate_too_short(self, session):
        r = session.post(f"{API}/generate", json={"profile_text": "court", "job_text": "court"}, timeout=15)
        assert r.status_code == 400

    def test_generate_full(self, session):
        payload = {
            "profile_text": PROFILE_FR,
            "job_text": JOB_FR,
            "template": "corporate",
        }
        r = session.post(f"{API}/generate", json=payload, timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        # Top-level
        assert "id" in data and isinstance(data["id"], str) and len(data["id"]) >= 32
        assert data.get("template") == "corporate"
        assert "created_at" in data
        # CV
        cv = data.get("cv") or {}
        assert "full_name" in cv
        assert "summary" in cv and len(cv["summary"]) > 0
        assert "experiences" in cv and isinstance(cv["experiences"], list)
        # Letter
        letter = data.get("letter") or {}
        assert "body" in letter and len(letter["body"]) > 50
        # Adaptations
        adp = data.get("adaptations") or {}
        assert "match_score" in adp
        assert "keywords_matched" in adp
        assert "keywords_added" in adp
        # No mongo _id
        assert "_id" not in data
        state["gen_id"] = data["id"]

    def test_list_includes_new(self, session):
        assert "gen_id" in state, "generate must run first"
        r = session.get(f"{API}/generations", timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        ids = [i.get("id") for i in items]
        assert state["gen_id"] in ids
        # match_score flattened
        ours = next(i for i in items if i["id"] == state["gen_id"])
        assert "match_score" in ours
        assert "_id" not in ours

    def test_get_by_id(self, session):
        assert "gen_id" in state
        r = session.get(f"{API}/generations/{state['gen_id']}", timeout=30)
        assert r.status_code == 200
        doc = r.json()
        assert doc["id"] == state["gen_id"]
        assert "cv" in doc and "letter" in doc and "adaptations" in doc
        assert "_id" not in doc

    def test_get_404(self, session):
        r = session.get(f"{API}/generations/does-not-exist-uuid", timeout=15)
        assert r.status_code == 404

    def test_update_template(self, session):
        assert "gen_id" in state
        r = session.put(
            f"{API}/generations/{state['gen_id']}",
            json={"template": "startup"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["template"] == "startup"
        # Re-GET to confirm persistence
        r2 = session.get(f"{API}/generations/{state['gen_id']}", timeout=15)
        assert r2.status_code == 200
        assert r2.json()["template"] == "startup"

    def test_update_empty_patch(self, session):
        assert "gen_id" in state
        r = session.put(f"{API}/generations/{state['gen_id']}", json={}, timeout=15)
        assert r.status_code == 400

    def test_delete(self, session):
        assert "gen_id" in state
        r = session.delete(f"{API}/generations/{state['gen_id']}", timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True
        # Confirm gone
        r2 = session.get(f"{API}/generations/{state['gen_id']}", timeout=15)
        assert r2.status_code == 404

    def test_delete_again_404(self, session):
        assert "gen_id" in state
        r = session.delete(f"{API}/generations/{state['gen_id']}", timeout=15)
        assert r.status_code == 404
