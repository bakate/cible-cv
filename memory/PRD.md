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

## Implémenté (Iter 2 — Feb 2026)
- Auth Google (Emergent Managed) avec scoping par utilisateur (premier user = admin)
- Génération PDF native texte côté backend via Reportlab (ATS-friendly) — remplace html2canvas
- Layouts PDF 1 colonne + 2 colonnes (BalancedColumns)
- Export Word (.docx) via python-docx
- ATS Check (score + mots-clés manquants)
- Regroupement automatique des compétences par famille + surlignage matching offre
- Couleur d'accent personnalisable + pin Base CV
- Liens cliquables dans le PDF (email / LinkedIn / portfolio)
- **Typographie premium Inter (TTF embarqué) dans tous les PDF** (`/app/backend/fonts/Inter-*.ttf`)
  - Famille enregistrée via `registerFontFamily` + `addMapping` (Regular / Bold / Italic / BoldItalic)
  - Fallback automatique vers Helvetica si les TTF sont absents

## Implémenté (Iter 3 — Juin 2026) — Refonte architecture
- **Backend hexagonal** : `app/domain` (modèles Pydantic, règles, prompts, erreurs) → `app/application` (ports Protocol + use cases) → `app/adapters` (inbound HTTP FastAPI fin ; outbound Mongo/Claude/parsers/OAuth/Reportlab/docx). Composition root `app/container.py`, `server.py` réduit au câblage. Contrats API inchangés.
- **Frontend hexagonal + XState v5** : `src/core` en TypeScript (types, règles pures, ports, machines auth/wizard/preview/history/ats), `src/infrastructure` (adapters axios + navigateur), `src/shell` (pages/composants React = coquille sans logique). Toasts et navigation sont émis par les machines (`emit`) et exécutés par `useShellEffects`.
- Édition du CV pilotée par événements à chemin (`EDIT_SET/EDIT_APPEND/EDIT_REMOVE`) appliqués immuablement dans le domaine.
- Tests : `backend/tests/unit` (20 tests pytest, fakes in-memory) ; `frontend/src/core/__tests__` (23 tests jest, services fake).
- Dépendances nettoyées : html2pdf.js, html2canvas, jspdf, react-query, swr, zod, recharts, lodash, dayjs, date-fns, framer-motion retirés. Ajout xstate, @xstate/react, typescript 5.9. `jsconfig.json` remplacé par `tsconfig.json`.
- Doc : `/app/ARCHITECTURE.md`.

## Backlog
- P1 : amélioration de l'éditeur (expériences, formations) en ligne
- P1 : suggestions d'amélioration manuelles depuis le panneau adaptations
- P2 : upload de CV en plusieurs langues
- P2 : génération multi-versions A/B
- P2 : tag/dossiers dans l'historique
