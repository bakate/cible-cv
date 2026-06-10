# Cible CV — PRD

## Problème
App MVP personnelle pour générer automatiquement un CV moderne et une lettre de motivation adaptés à chaque offre d'emploi, en français, à partir d'un CV/profil LinkedIn et d'une annonce.

## Personas
- Utilisateur unique (le créateur de l'app), chercheur d'emploi.

## Choix utilisateur (Itération 1)
- LLM : **Claude Sonnet 4.5** (claude-sonnet-4-5-20250929) via EMERGENT_LLM_KEY
- Profil : **PDF + saisie manuelle** + tentative LinkedIn URL
- Visuel : **Moderne & coloré** (Neo-brutalist soft, accent #FF3E1A)
- Stockage : **MongoDB avec historique**
- Auth : **aucune**

## Architecture
- Backend FastAPI (`/api`) + MongoDB (collection `generations`)
- Frontend React (CRA + Tailwind + shadcn) avec react-router
- LLM via `emergentintegrations.llm.chat` (Anthropic)
- Parsing PDF (`pypdf`), DOCX (`python-docx`), HTML (BeautifulSoup + html2text)
- Export PDF côté client via `html2pdf.js`

## Modèle de données
`generations`:
- id (uuid), title, company, position, template (corporate|startup)
- profile_text, profile_meta, job_text, job_meta
- cv (JSON), letter (JSON), adaptations (JSON), photo_data_url
- created_at (ISO string)

## Workflow utilisateur (4 étapes)
1. Profil (PDF / LinkedIn URL / manuel) + photo optionnelle
2. Offre (URL / texte / PDF)
3. Template (Corporate / Startup) → Génération
4. Aperçu, édition inline, export PDF, copie texte lettre, historique

## Endpoints
- `GET /api/` — health
- `POST /api/parse/pdf` — extract text from uploaded PDF/DOCX/TXT
- `POST /api/parse/url` — scrape URL → markdown
- `POST /api/generate` — Claude generates `cv`, `letter`, `adaptations`
- `GET /api/generations` — list
- `GET /api/generations/{id}` — detail
- `PUT /api/generations/{id}` — patch (edits / template / photo)
- `DELETE /api/generations/{id}` — delete

## Implémenté (Iter 1 — Feb 2026)
- Wizard 4 étapes en français
- Parsing PDF/DOCX/URL backend
- Génération CV + lettre + adaptations via Claude Sonnet 4.5
- 2 templates CV (Corporate moderne / Startup tech)
- Aperçu, édition inline (name/headline/summary/lettre), export PDF, copie lettre
- Historique avec score de match
- Design neo-brutalist soft, Cabinet Grotesk + Outfit

## Backlog
- P1 : amélioration de l'éditeur (expériences, formations) en ligne
- P1 : suggestions d'amélioration manuelles depuis le panneau adaptations
- P2 : upload de CV en plusieurs langues
- P2 : génération multi-versions A/B
- P2 : tag/dossiers dans l'historique
