"""LLM-assisted analysis: skill regrouping and ATS compatibility audit."""
import logging
from typing import Any, Dict, List, Optional

from app.application.ports import GenerationRepository, LlmPort
from app.domain.errors import NotFoundError, UpstreamError, ValidationError
from app.domain.models import CvData, OwnerScope
from app.domain.prompts import SYSTEM_PROMPT, ats_check_prompt, regroup_skills_prompt
from app.domain.rules import cv_to_plain_text, extract_json_object

logger = logging.getLogger("ciblecv")


class RegroupSkills:
    def __init__(self, llm: LlmPort):
        self.llm = llm

    async def execute(self, skills: List[str], tools: List[str]) -> Dict[str, Any]:
        if not skills and not tools:
            raise ValidationError("Aucune compétence à regrouper")
        try:
            raw = await self.llm.complete(SYSTEM_PROMPT, regroup_skills_prompt(skills, tools))
            return extract_json_object(raw)
        except Exception as e:
            logger.exception("regroup failed")
            raise UpstreamError(f"Regroupement échoué: {e}") from e


class AtsCheck:
    def __init__(self, llm: LlmPort, generations: GenerationRepository):
        self.llm, self.generations = llm, generations

    async def execute(
        self,
        scope: OwnerScope,
        generation_id: Optional[str] = None,
        job_text: str = "",
        cv: Optional[CvData] = None,
    ) -> Dict[str, Any]:
        if generation_id:
            gen = await self.generations.find_by_id(generation_id, scope.owner_id)
            if not gen:
                raise NotFoundError("Génération introuvable")
            job_text, cv = gen.job_text, gen.cv
        job_text = (job_text or "").strip()
        if not job_text or not cv:
            raise ValidationError("job_text et cv requis")
        try:
            raw = await self.llm.complete(SYSTEM_PROMPT, ats_check_prompt(job_text, cv_to_plain_text(cv)))
            return extract_json_object(raw)
        except Exception as e:
            logger.exception("ats-check failed")
            raise UpstreamError(f"Analyse ATS échouée: {e}") from e
