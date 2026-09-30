"""DocumentRenderer implementation delegating to the Reportlab / python-docx modules."""
from pathlib import Path

from app.domain.models import CvData, LetterData

from . import docx_python, pdf_reportlab
from .fonts import PdfFonts


class OfficeDocumentRenderer:
    def __init__(self, fonts_dir: Path):
        PdfFonts.register_inter(fonts_dir)

    def cv_pdf(self, cv: CvData, layout: str) -> bytes:
        return pdf_reportlab.render_cv_pdf(cv, layout)

    def cv_docx(self, cv: CvData) -> bytes:
        return docx_python.render_cv_docx(cv)

    def letter_pdf(self, letter: LetterData, sender_cv: CvData, company: str) -> bytes:
        return pdf_reportlab.render_letter_pdf(letter, sender_cv, company)

    def letter_docx(self, letter: LetterData, sender_cv: CvData, company: str) -> bytes:
        return docx_python.render_letter_docx(letter, sender_cv, company)
