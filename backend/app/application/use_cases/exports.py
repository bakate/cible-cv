"""Export a generation's CV or letter as PDF / DOCX."""
from app.application.ports import DocumentRenderer, GenerationRepository
from app.domain.errors import NotFoundError, ValidationError
from app.domain.models import ExportedDocument, OwnerScope
from app.domain.rules import export_filename, normalize_layout

PDF_MEDIA = "application/pdf"
DOCX_MEDIA = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


class ExportDocument:
    def __init__(self, generations: GenerationRepository, renderer: DocumentRenderer):
        self.generations, self.renderer = generations, renderer

    async def execute(self, gen_id: str, kind: str, fmt: str, scope: OwnerScope, layout: str = "single") -> ExportedDocument:
        if kind not in ("cv", "letter") or fmt not in ("pdf", "docx"):
            raise ValidationError("Export non supporté")
        gen = await self.generations.find_by_id(gen_id, scope.owner_id)
        if not gen:
            raise NotFoundError("Génération introuvable")

        if kind == "cv" and fmt == "pdf":
            content = self.renderer.cv_pdf(gen.cv, normalize_layout(layout))
        elif kind == "cv":
            content = self.renderer.cv_docx(gen.cv)
        elif fmt == "pdf":
            content = self.renderer.letter_pdf(gen.letter, gen.cv, gen.company)
        else:
            content = self.renderer.letter_docx(gen.letter, gen.cv, gen.company)

        return ExportedDocument(
            content=content,
            filename=export_filename(kind, gen.cv, gen.company, fmt),
            media_type=PDF_MEDIA if fmt == "pdf" else DOCX_MEDIA,
        )
