"""Use cases around source documents: extract text from uploads and web pages."""
import logging

from app.application.ports import DocumentTextExtractor, WebPageFetcher
from app.domain.errors import ValidationError
from app.domain.models import SUPPORTED_UPLOAD_EXTENSIONS
from app.domain.rules import validate_url_content

logger = logging.getLogger("ciblecv")


class ExtractDocumentText:
    def __init__(self, extractor: DocumentTextExtractor):
        self.extractor = extractor

    def execute(self, filename: str, content: bytes) -> str:
        name = (filename or "").lower()
        if not any(name.endswith(ext) for ext in SUPPORTED_UPLOAD_EXTENSIONS):
            raise ValidationError("Format non supporté (PDF, DOCX, TXT)")
        try:
            text = self.extractor.extract(name, content)
        except Exception as e:
            logger.exception("document extraction failed")
            raise ValidationError(f"Lecture du fichier impossible: {e}") from e
        if not text:
            raise ValidationError("Le document est vide ou non lisible.")
        return text


class ExtractUrlText:
    def __init__(self, fetcher: WebPageFetcher):
        self.fetcher = fetcher

    def execute(self, url: str) -> str:
        url = (url or "").strip()
        if not url:
            raise ValidationError("URL requise")
        try:
            text = self.fetcher.fetch_text(url)
        except Exception as e:
            logger.warning("URL fetch failed for %s: %s", url, e)
            raise ValidationError(
                "Impossible de récupérer cette URL automatiquement. Collez le contenu à la main."
            ) from e
        validate_url_content(text)
        return text
