"""Reportlab font registration (Inter TTF, Helvetica fallback)."""
import logging
from pathlib import Path

from reportlab.lib.fonts import addMapping
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

logger = logging.getLogger("ciblecv")


class PdfFonts:
    regular = "Helvetica"
    bold = "Helvetica-Bold"
    italic = "Helvetica-Oblique"
    bold_italic = "Helvetica-BoldOblique"

    @classmethod
    def register_inter(cls, fonts_dir: Path) -> None:
        try:
            pdfmetrics.registerFont(TTFont("Inter", str(fonts_dir / "Inter-Regular.ttf")))
            pdfmetrics.registerFont(TTFont("Inter-Bold", str(fonts_dir / "Inter-Bold.ttf")))
            pdfmetrics.registerFont(TTFont("Inter-Italic", str(fonts_dir / "Inter-Italic.ttf")))
            pdfmetrics.registerFont(TTFont("Inter-BoldItalic", str(fonts_dir / "Inter-BoldItalic.ttf")))
            pdfmetrics.registerFontFamily("Inter", normal="Inter", bold="Inter-Bold", italic="Inter-Italic", boldItalic="Inter-BoldItalic")
            addMapping("Inter", 0, 0, "Inter")
            addMapping("Inter", 1, 0, "Inter-Bold")
            addMapping("Inter", 0, 1, "Inter-Italic")
            addMapping("Inter", 1, 1, "Inter-BoldItalic")
            cls.regular, cls.bold, cls.italic, cls.bold_italic = "Inter", "Inter-Bold", "Inter-Italic", "Inter-BoldItalic"
            logger.info("Registered Inter font family for PDF rendering")
        except Exception as err:  # pragma: no cover - defensive fallback
            logger.warning("Inter font registration failed, falling back to Helvetica: %s", err)
