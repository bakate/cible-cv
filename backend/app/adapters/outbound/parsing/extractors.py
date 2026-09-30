"""Text extraction adapters: uploaded files (pypdf / python-docx) and web pages (requests + bs4)."""
import io
import logging
import re

import html2text
import requests
from bs4 import BeautifulSoup
from docx import Document
from pypdf import PdfReader

logger = logging.getLogger("ciblecv")


class FileTextExtractor:
    def extract(self, filename: str, content: bytes) -> str:
        if filename.endswith(".pdf"):
            return self._pdf(content)
        if filename.endswith(".docx"):
            return self._docx(content)
        return content.decode("utf-8", errors="ignore").strip()

    @staticmethod
    def _pdf(content: bytes) -> str:
        reader = PdfReader(io.BytesIO(content))
        parts = []
        for page in reader.pages:
            try:
                parts.append(page.extract_text() or "")
            except Exception as e:
                logger.warning("pdf page extract failed: %s", e)
        return "\n".join(parts).strip()

    @staticmethod
    def _docx(content: bytes) -> str:
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs if p.text).strip()


class RequestsWebPageFetcher:
    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    }

    def __init__(self, timeout: int = 15, max_chars: int = 20000):
        self.timeout, self.max_chars = timeout, max_chars

    def fetch_text(self, url: str) -> str:
        r = requests.get(url, headers=self.HEADERS, timeout=self.timeout)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "lxml")
        for tag in soup(["script", "style", "noscript", "nav", "footer", "header"]):
            tag.decompose()
        main = soup.find("main") or soup.find("article") or soup.body or soup
        h = html2text.HTML2Text()
        h.ignore_links = True
        h.ignore_images = True
        h.body_width = 0
        text = re.sub(r"\n{3,}", "\n\n", h.handle(str(main))).strip()
        return text[: self.max_chars]
