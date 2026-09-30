"""Native-text PDF rendering with Reportlab (ATS-friendly)."""
import io
import re
from datetime import datetime
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import BalancedColumns, Paragraph, SimpleDocTemplate, Spacer
from reportlab.platypus.flowables import HRFlowable

from app.domain.models import CvData, LetterData
from app.domain.rules import accent_of

from .fonts import PdfFonts

Styles = Dict[str, ParagraphStyle]


def _esc(s: Any) -> str:
    if s is None:
        return ""
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _contact_link(kind: str, value: str, accent_hex: str) -> str:
    text = _esc(value)
    if kind == "email":
        href = f"mailto:{value}"
    elif kind == "phone":
        href = "tel:" + re.sub(r"[^0-9+]", "", value)
    elif kind in ("linkedin", "github", "website"):
        href = value if str(value).startswith("http") else f"https://{value}"
    else:
        return text
    return f'<a href="{_esc(href)}" color="{accent_hex}">{text}</a>'


def _soft_color(hex_color: str, mix: float = 0.85) -> str:
    h = (hex_color or "#FF3E1A").lstrip("#")
    if len(h) != 6:
        h = "FF3E1A"
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    blend = lambda c: int(c * (1 - mix) + 255 * mix)
    return f"#{blend(r):02X}{blend(g):02X}{blend(b):02X}"


def _styles(accent_hex: str) -> Styles:
    accent = colors.HexColor(accent_hex)
    muted = colors.HexColor("#6B6B6B")
    f = PdfFonts
    return {
        "name": ParagraphStyle("Name", fontSize=28, leading=30, fontName=f.bold, spaceAfter=2, textColor=colors.black),
        "headline": ParagraphStyle("Headline", fontSize=13, leading=16, fontName=f.italic, textColor=accent, spaceBefore=6, spaceAfter=6),
        "contact": ParagraphStyle("Contact", fontSize=9.5, leading=13, fontName=f.regular, textColor=muted, spaceBefore=2, spaceAfter=8),
        "section": ParagraphStyle("Section", fontSize=11, leading=14, fontName=f.bold, textColor=accent, spaceBefore=14, spaceAfter=0),
        "body": ParagraphStyle("Body", fontSize=10, leading=14, fontName=f.regular, spaceAfter=4),
        "exp_title": ParagraphStyle("ExpTitle", fontSize=11.5, leading=14, fontName=f.bold, spaceBefore=6, spaceAfter=0),
        "exp_meta": ParagraphStyle("ExpMeta", fontSize=9.5, leading=12, fontName=f.italic, textColor=muted, spaceAfter=4),
        "bullet": ParagraphStyle("Bullet", fontSize=10, leading=13.5, fontName=f.regular, leftIndent=12, spaceAfter=1.5),
        "right": ParagraphStyle("Right", fontSize=11, leading=14, fontName=f.regular, alignment=TA_RIGHT),
        "letter_body": ParagraphStyle("LetterBody", fontSize=11, leading=15, fontName=f.regular, spaceAfter=6),
        "skill_cat": ParagraphStyle("SkillCat", fontSize=10, leading=13, fontName=f.bold, textColor=accent, spaceBefore=5, spaceAfter=2),
        "skill_chips": ParagraphStyle("SkillChips", fontSize=9.5, leading=15, fontName=f.regular, spaceAfter=4),
    }


def _section_heading(title: str, accent_hex: str, styles: Styles) -> List:
    return [
        Paragraph(title.upper(), styles["section"]),
        HRFlowable(width=22 * mm, thickness=1.4, color=colors.HexColor(accent_hex), spaceBefore=2, spaceAfter=6, hAlign="LEFT"),
    ]


def _header(flow: List, cv: CvData, styles: Styles, accent_hex: str) -> None:
    flow.append(Paragraph(_esc(cv.get("full_name", "")), styles["name"]))
    flow.append(HRFlowable(width=28 * mm, thickness=2.6, color=colors.HexColor(accent_hex), spaceBefore=3, spaceAfter=2, hAlign="LEFT"))
    if cv.get("headline"):
        flow.append(Paragraph(_esc(cv["headline"]), styles["headline"]))
    contact = cv.get("contact") or {}
    parts = []
    for kind in ("email", "phone", "location", "linkedin", "github", "website"):
        val = contact.get(kind)
        if not val:
            continue
        parts.append(_esc(val) if kind == "location" else _contact_link(kind, val, accent_hex))
    if parts:
        dot = f'<font color="{accent_hex}">•</font>'
        flow.append(Paragraph(f" &nbsp;{dot}&nbsp; ".join(parts), styles["contact"]))


def _experiences(flow: List, experiences: List[Dict[str, Any]], styles: Styles, accent_hex: str) -> None:
    if not experiences:
        return
    flow.extend(_section_heading("Expériences professionnelles", accent_hex, styles))
    chevron = f'<font color="{accent_hex}"><b>›</b></font>'
    for e in experiences:
        flow.append(Paragraph(
            f'<b>{_esc(e.get("title", ""))}</b> <font color="#9A9A9A">·</font> <font color="#444">{_esc(e.get("company", ""))}</font>',
            styles["exp_title"],
        ))
        loc = _esc(e.get("location", ""))
        dates_html = f'<font face="Courier" color="{accent_hex}">{_esc(e.get("start", ""))} – {_esc(e.get("end", ""))}</font>'
        flow.append(Paragraph(f"{loc} &nbsp;·&nbsp; {dates_html}" if loc else dates_html, styles["exp_meta"]))
        for b in (e.get("bullets") or []):
            flow.append(Paragraph(f"{chevron}&nbsp; {_esc(b)}", styles["bullet"]))
        flow.append(Spacer(1, 4))


def _education(flow: List, education: List[Dict[str, Any]], styles: Styles, accent_hex: str) -> None:
    if not education:
        return
    flow.extend(_section_heading("Formation", accent_hex, styles))
    for ed in education:
        flow.append(Paragraph(
            f'<b>{_esc(ed.get("degree", ""))}</b> <font color="#9A9A9A">·</font> <font color="#444">{_esc(ed.get("school", ""))}</font>',
            styles["exp_title"],
        ))
        meta = f'<font face="Courier" color="{accent_hex}">{_esc(ed.get("start", ""))} – {_esc(ed.get("end", ""))}</font>'
        if ed.get("details"):
            meta += f' &nbsp;·&nbsp; {_esc(ed["details"])}'
        flow.append(Paragraph(meta, styles["exp_meta"]))


def _skills(flow: List, cv: CvData, styles: Styles, accent_hex: str) -> None:
    soft = _soft_color(accent_hex, mix=0.86)
    pill = lambda txt: f'<font backColor="{soft}" color="#0A0A0A">&nbsp;{_esc(txt)}&nbsp;</font>'
    sep = "&nbsp;&nbsp;&nbsp;"
    if cv.get("skill_groups"):
        flow.extend(_section_heading("Compétences", accent_hex, styles))
        for g in cv["skill_groups"]:
            cat = _esc(g.get("category", ""))
            items = g.get("items") or []
            if not items and not cat:
                continue
            if cat:
                flow.append(Paragraph(f'<font color="{accent_hex}">▍</font>&nbsp; {cat.upper()}', styles["skill_cat"]))
            if items:
                flow.append(Paragraph(sep.join(pill(i) for i in items), styles["skill_chips"]))
        return
    if cv.get("skills"):
        flow.extend(_section_heading("Compétences", accent_hex, styles))
        flow.append(Paragraph(sep.join(pill(s) for s in cv["skills"]), styles["skill_chips"]))
    if cv.get("tools"):
        flow.extend(_section_heading("Outils", accent_hex, styles))
        flow.append(Paragraph(sep.join(pill(s) for s in cv["tools"]), styles["skill_chips"]))


def _extras(flow: List, cv: CvData, styles: Styles, accent_hex: str) -> None:
    if cv.get("languages"):
        flow.extend(_section_heading("Langues", accent_hex, styles))
        langs = " &nbsp;·&nbsp; ".join(
            f'<b>{_esc(lang.get("name", ""))}</b> <font color="#6B6B6B">{_esc(lang.get("level", ""))}</font>'
            for lang in cv["languages"] if lang.get("name")
        )
        flow.append(Paragraph(langs, styles["body"]))
    if cv.get("certifications"):
        flow.extend(_section_heading("Certifications", accent_hex, styles))
        for cer in cv["certifications"]:
            line = f'<b>{_esc(cer.get("name", ""))}</b>'
            if cer.get("issuer"):
                line += f' <font color="#9A9A9A">·</font> <font color="#444">{_esc(cer["issuer"])}</font>'
            if cer.get("year"):
                line += f' <font color="#9A9A9A">({_esc(cer["year"])})</font>'
            flow.append(Paragraph(line, styles["body"]))
    if cv.get("interests"):
        flow.extend(_section_heading("Centres d'intérêt", accent_hex, styles))
        flow.append(Paragraph(" &nbsp;·&nbsp; ".join(_esc(i) for i in cv["interests"]), styles["body"]))


def _body_sections(flow: List, cv: CvData, styles: Styles, accent_hex: str) -> None:
    if cv.get("summary"):
        flow.extend(_section_heading("Profil", accent_hex, styles))
        flow.append(Paragraph(_esc(cv["summary"]), styles["body"]))
    _experiences(flow, cv.get("experiences") or [], styles, accent_hex)
    _education(flow, cv.get("education") or [], styles, accent_hex)
    _skills(flow, cv, styles, accent_hex)
    _extras(flow, cv, styles, accent_hex)


def render_cv_pdf(cv: CvData, layout: str = "single") -> bytes:
    accent_hex = accent_of(cv)
    styles = _styles(accent_hex)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm, topMargin=15 * mm, bottomMargin=15 * mm,
        title=cv.get("full_name", "CV"),
    )
    flow: List = []
    _header(flow, cv, styles, accent_hex)
    if layout == "two-col":
        body: List = []
        _body_sections(body, cv, styles, accent_hex)
        flow.append(BalancedColumns(body, nCols=2, needed=72, spaceBefore=4, spaceAfter=4, vLinesStrokeColor=None, innerPadding=6 * mm))
    else:
        _body_sections(flow, cv, styles, accent_hex)
    doc.build(flow)
    return buf.getvalue()


def render_letter_pdf(letter: LetterData, sender_cv: CvData, company: str) -> bytes:
    styles = _styles(accent_of(sender_cv))
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=22 * mm, rightMargin=22 * mm, topMargin=22 * mm, bottomMargin=22 * mm,
        title="Lettre de motivation",
    )
    flow: List = []
    contact = (sender_cv or {}).get("contact") or {}
    flow.append(Paragraph(f"<b>{_esc(sender_cv.get('full_name', ''))}</b>", styles["letter_body"]))
    for k in ("email", "phone", "location"):
        if contact.get(k):
            flow.append(Paragraph(_esc(contact[k]), styles["letter_body"]))
    flow.append(Spacer(1, 10))
    flow.append(Paragraph(f"<b>{_esc(company)}</b>", styles["right"]))
    flow.append(Paragraph(datetime.now().strftime("%d/%m/%Y"), styles["right"]))
    flow.append(Spacer(1, 16))
    if letter.get("subject"):
        flow.append(Paragraph(f"<b>Objet :</b> {_esc(letter['subject'])}", styles["letter_body"]))
    if letter.get("recipient"):
        flow.append(Paragraph(_esc(letter["recipient"]), styles["letter_body"]))
    for para in (letter.get("body") or "").split("\n"):
        flow.append(Paragraph(_esc(para), styles["letter_body"]) if para.strip() else Spacer(1, 6))
    doc.build(flow)
    return buf.getvalue()
