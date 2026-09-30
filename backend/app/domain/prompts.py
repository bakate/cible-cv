"""LLM prompts — business knowledge about how documents must be produced."""
import json
from typing import List

from .rules import (
    MAX_ATS_SECTION_CHARS,
    MAX_JOB_CHARS_FOR_LLM,
    MAX_PROFILE_CHARS_FOR_LLM,
)

SYSTEM_PROMPT = """Tu es un expert RH et coach carrière francophone. Tu produis des CV et lettres de motivation en français, percutants, professionnels et rigoureusement honnêtes.

RÈGLES CRITIQUES:
1. N'invente JAMAIS d'expérience, de diplôme, de compétence ou de chiffre.
2. Si une information manque, reste sobre, ne comble pas avec du fictif.
3. Adapte le vocabulaire au champ lexical de l'annonce, sans mentir.
4. Réorganise et reformule pour mettre en avant ce qui matche l'offre.
5. La lettre doit être naturelle, crédible, sans formules clichées creuses.
6. Réponds STRICTEMENT en JSON valide, sans texte avant/après, sans markdown.
"""


_GENERATION_TEMPLATE = """Voici le PROFIL CANDIDAT (extrait brut du CV / LinkedIn / saisie manuelle):
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
      "linkedin": "URL complète (ex: https://www.linkedin.com/in/...) ou null",
      "github": "URL complète (ex: https://github.com/...) ou null",
      "website": "URL complète (ex: https://...) ou null"
    }},
    "summary": "résumé pro 3-4 lignes orienté annonce",
    "skill_groups": [
      {{"category": "ex: Frontend / Backend / DevOps / Sécurité / IA / Data / Méthodologies / Outils", "items": ["compétence ou outil concret", "..."]}}
    ],
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
"skill_groups" doit être bien rempli : 5 à 8 familles thématiques (ex. Frontend, Backend, DevOps & Cloud, Sécurité, IA, Data, Méthodologies, Outils) avec les compétences/outils du candidat ventilés dedans. La liste "skills" plate reste utile pour les ATS, les deux doivent contenir les mêmes éléments.
RAPPEL: Reste fidèle au parcours réel du candidat. Sors UNIQUEMENT le JSON.
"""


def generation_prompt(profile_text: str, job_text: str) -> str:
    return _GENERATION_TEMPLATE.format(
        profile=profile_text[:MAX_PROFILE_CHARS_FOR_LLM],
        job=job_text[:MAX_JOB_CHARS_FOR_LLM],
    )


def regroup_skills_prompt(skills: List[str], tools: List[str]) -> str:
    return (
        "Voici une liste de compétences et d'outils techniques d'un candidat. Regroupe-les "
        "en 5 à 8 familles thématiques pertinentes (ex. Frontend, Backend, DevOps & Cloud, "
        "Sécurité, IA, Data, Méthodologies, Outils). Garde TOUS les éléments — n'en perds "
        "aucun. Réponds STRICTEMENT en JSON valide:\n\n"
        '{"skill_groups": [{"category": "string", "items": ["string", ...]}]}'
        f"\n\nCompétences:\n{json.dumps(skills, ensure_ascii=False)}"
        f"\n\nOutils:\n{json.dumps(tools, ensure_ascii=False)}"
    )


def ats_check_prompt(job_text: str, cv_text: str) -> str:
    return (
        "Tu es un auditeur ATS senior. Évalue rigoureusement la compatibilité du CV avec l'offre.\n\n"
        f"OFFRE D'EMPLOI:\n---\n{job_text[:MAX_ATS_SECTION_CHARS]}\n---\n\n"
        f"CV DU CANDIDAT (structuré):\n---\n{cv_text[:MAX_ATS_SECTION_CHARS]}\n---\n\n"
        'Réponds STRICTEMENT en JSON, sans texte avant/après, sans markdown:\n'
        '{\n'
        '  "score": 0-100,\n'
        '  "verdict": "excellent" | "bon" | "moyen" | "faible",\n'
        '  "keywords_present": ["mots-clés présents ET dans CV ET dans offre"],\n'
        '  "keywords_missing": ["mots-clés importants de l\'offre ABSENTS du CV"],\n'
        '  "sections_check": {"summary": true|false, "experiences": true|false, "education": true|false, "skills": true|false, "languages": true|false, "contact": true|false},\n'
        '  "format_warnings": ["alerte concrète", "..."],\n'
        '  "recommendations": ["action concrète priorisée", "..."],\n'
        '  "experience_match": "phrase courte sur le fit expérience",\n'
        '  "skill_gap_analysis": "phrase courte sur le gap compétences"\n'
        '}\n'
    )
