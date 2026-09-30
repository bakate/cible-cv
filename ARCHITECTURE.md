# Architecture — Cible CV

Architecture hexagonale (ports & adapters) des deux côtés. Le cœur métier ne dépend d'aucun framework ;
les frameworks (FastAPI, Mongo, React, axios, navigateur) sont des adapters interchangeables.

## Backend (`backend/`)

```
server.py                          Point d'entrée FastAPI : lifespan → build_container(), CORS, error handlers
app/domain/                        CŒUR — zéro import framework
  models.py                        Entités Pydantic (User, Session, Generation, BaseProfile, OwnerScope…)
  rules.py                         Règles pures (validation, titre, rôle admin, nom de fichier, cv→texte…)
  prompts.py                       Savoir métier LLM (prompts génération / regroupement / audit ATS)
  errors.py                        Erreurs métier (Validation, NotFound, Authentication, Upstream…)
app/application/
  ports.py                         Interfaces (Protocol) : repositories, LlmPort, OAuthProvider, DocumentRenderer, Clock…
  use_cases/                       Un objet par cas d'usage, `execute()` — orchestre les ports
app/adapters/inbound/http/         Routers FastAPI ultra-fins, schémas de transport, mapping erreurs → HTTP, deps (session)
app/adapters/outbound/             Mongo (repositories), Claude (LLM), pypdf/docx/requests (extraction),
                                   Emergent OAuth, Reportlab + python-docx (renderers), horloge/uuid
app/container.py                   Composition root : Settings.from_env() + câblage des adapters dans les use cases
tests/unit/                        Tests des use cases avec fakes in-memory (aucune I/O)
```

Règle de dépendance : `adapters → application → domain`. Le domaine ne connaît ni HTTP ni Mongo ni Claude.

## Frontend (`frontend/src/`)

```
core/                              CŒUR TypeScript — indépendant de React
  domain/types.ts                  Types métier (Cv, Generation, User…)
  domain/cv.ts                     Règles pures : accent, matching mots-clés, édition immuable par chemin, texte lettre
  domain/wizard.ts                 Validation des saisies, étapes
  ports/index.ts                   Interfaces des gateways (auth, parsing, générations, profil, analyse, exports)
                                   + effets de bord (Downloader, Clipboard, Confirmer, FileReader)
  machines/                        XState v5 : authMachine, wizardMachine, previewMachine, historyMachine, atsMachine
                                   Toute la logique (transitions, appels via ports, toasts & navigation émis en events)
  testing/fakeServices.ts          Services in-memory pour les tests
  __tests__/core.test.ts           Tests des règles et des machines (jest, sans DOM ni HTTP)
infrastructure/
  http/gateways.ts                 Adapters axios implémentant les ports (seul endroit connaissant les URLs)
  browser/adapters.ts              Adapters navigateur (download, clipboard, confirm, FileReader)
  buildServices.ts                 Composition root frontend
shell/                             COQUILLE React — aucune règle métier, aucun appel réseau, aucun toast décidé ici
  providers.jsx                    Injection des Services, acteur auth global, bridge events machine → toast/navigate
  pages/, components/              Affichent un snapshot, envoient des events (`send({type: …})`)
components/ui/                     Primitives shadcn (design system)
```

Pour remplacer le front (mobile, CLI, autre framework) : réutiliser `core/` + fournir une implémentation de `Services`.
Pour tester : `buildFakeServices()` remplace tout le réseau.

## Commandes

- Backend unit : `cd backend && pytest tests/unit -q`
- Frontend core : `cd frontend && CI=true yarn test --watchAll=false`
- Typecheck : `cd frontend && npx tsc --noEmit`
