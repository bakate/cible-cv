"""Generation lifecycle: create with the LLM, list, read, patch, delete."""
import logging
from typing import List

from app.application.ports import Clock, GenerationRepository, IdGenerator, LlmPort
from app.domain.errors import NotFoundError, UpstreamError, ValidationError
from app.domain.models import (
    Generation,
    GenerationPatch,
    GenerationRequest,
    GenerationSummary,
    LlmGenerationOutput,
    OwnerScope,
)
from app.domain.prompts import SYSTEM_PROMPT, generation_prompt
from app.domain.rules import (
    build_generation_title,
    extract_json_object,
    validate_generation_inputs,
)

logger = logging.getLogger("ciblecv")
LIST_LIMIT = 200


class GenerateDocuments:
    def __init__(self, llm: LlmPort, generations: GenerationRepository, clock: Clock, ids: IdGenerator):
        self.llm, self.generations, self.clock, self.ids = llm, generations, clock, ids

    async def execute(self, req: GenerationRequest, scope: OwnerScope) -> Generation:
        validate_generation_inputs(req.profile_text, req.job_text)
        try:
            raw = await self.llm.complete(SYSTEM_PROMPT, generation_prompt(req.profile_text, req.job_text))
            output = LlmGenerationOutput.model_validate(extract_json_object(raw))
        except Exception as e:
            logger.exception("LLM generation failed")
            raise UpstreamError(f"Échec de la génération: {e}") from e

        naming = build_generation_title(output.adaptations, req.job_meta)
        generation = Generation(
            id=self.ids.new_id(),
            user_id=scope.user_id,
            template=req.template,
            profile_text=req.profile_text,
            profile_meta=req.profile_meta,
            job_text=req.job_text,
            job_meta=req.job_meta,
            cv=output.cv,
            letter=output.letter,
            adaptations=output.adaptations,
            photo_data_url=req.photo_data_url,
            created_at=self.clock.now().isoformat(),
            **naming,
        )
        await self.generations.insert(generation)
        return generation


class ListGenerations:
    def __init__(self, generations: GenerationRepository):
        self.generations = generations

    async def execute(self, scope: OwnerScope) -> List[GenerationSummary]:
        return await self.generations.list_summaries(scope.owner_id, LIST_LIMIT)


class GetGeneration:
    def __init__(self, generations: GenerationRepository):
        self.generations = generations

    async def execute(self, gen_id: str, scope: OwnerScope) -> Generation:
        doc = await self.generations.find_by_id(gen_id, scope.owner_id)
        if not doc:
            raise NotFoundError("Génération introuvable")
        return doc


class UpdateGeneration:
    def __init__(self, generations: GenerationRepository):
        self.generations = generations

    async def execute(self, gen_id: str, patch: GenerationPatch, scope: OwnerScope) -> Generation:
        changes = patch.changes()
        if not changes:
            raise ValidationError("Rien à mettre à jour")
        doc = await self.generations.update(gen_id, scope.owner_id, changes)
        if not doc:
            raise NotFoundError("Génération introuvable")
        return doc


class DeleteGeneration:
    def __init__(self, generations: GenerationRepository):
        self.generations = generations

    async def execute(self, gen_id: str, scope: OwnerScope) -> None:
        if not await self.generations.delete(gen_id, scope.owner_id):
            raise NotFoundError("Génération introuvable")
