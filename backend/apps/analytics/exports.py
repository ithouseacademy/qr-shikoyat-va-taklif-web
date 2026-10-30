import os
from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def to_xlsx(sections):
    wb = Workbook()
    wb.remove(wb.active)
    for name, rows in sections.items():
        ws = wb.create_sheet(name[:30])
        if not rows:
            ws.append(['Ma‘lumot yo‘q'])
            continue
        heads = list(rows[0].keys())
        ws.append(heads)
        for c in ws[1]:
            c.font = Font(bold=True, color='FFFFFF')
            c.fill = PatternFill('solid', fgColor='2563EB')
        for r in rows:
            ws.append([str(v) if isinstance(v, (dict, list)) else v for v in r.values()])
        for i, h in enumerate(heads, 1):
            ws.column_dimensions[ws.cell(1, i).column_letter].width = max(14, min(50, len(str(h)) + 6))
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _font():
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'C:/Windows/Fonts/arial.ttf', '/Library/Fonts/Arial.ttf'):
        if os.path.exists(p):
            pdfmetrics.registerFont(TTFont('AppFont', p))
            return 'AppFont'
    return 'Helvetica'


def to_pdf(title, sections):
    font = _font()
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=24, rightMargin=24, topMargin=24, bottomMargin=24)
    st = getSampleStyleSheet()
    for s in st.byName.values():
        s.fontName = font
    els = [Paragraph(title, st['Title'])]
    for name, rows in sections.items():
        els += [Spacer(1, 10), Paragraph(name, st['Heading2'])]
        if not rows:
            els.append(Paragraph('Ma‘lumot yo‘q', st['Normal']))
            continue
        data = [list(rows[0].keys())] + [[Paragraph(str(v if v is not None else ''), st['BodyText']) for v in r.values()] for r in rows[:500]]
        t = Table(data, repeatRows=1)
        t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563EB')), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                               ('FONTNAME', (0, 0), (-1, -1), font), ('FONTSIZE', (0, 0), (-1, -1), 8),
                               ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#E2E8F0')), ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
        els.append(t)
    doc.build(els)
    return buf.getvalue()
