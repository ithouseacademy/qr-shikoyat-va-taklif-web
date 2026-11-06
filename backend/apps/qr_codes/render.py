from io import BytesIO
import qrcode
from PIL import Image, ImageDraw, ImageFont
from qrcode.constants import ERROR_CORRECT_H


def render_qr(qr, fmt='png', public_url=None):
    q = qrcode.QRCode(error_correction=ERROR_CORRECT_H, box_size=12, border=2)
    q.add_data(public_url or qr.public_url)
    q.make(fit=True)
    img = q.make_image(fill_color=qr.color, back_color=qr.bg_color).convert('RGB')
    logo = qr.organization.logo
    if qr.use_logo and logo:
        try:
            lg = Image.open(logo.path).convert('RGBA')
            side = img.size[0] // 5
            lg.thumbnail((side, side))
            pad = Image.new('RGBA', (lg.size[0] + 16, lg.size[1] + 16), (255, 255, 255, 255))
            pad.paste(lg, (8, 8), lg)
            img.paste(pad, ((img.size[0] - pad.size[0]) // 2, (img.size[1] - pad.size[1]) // 2), pad)
        except Exception:
            pass
    buf = BytesIO()
    if fmt == 'pdf':
        page = Image.new('RGB', (2480, 3508), 'white')  # A4 @300dpi
        big = img.resize((1700, 1700), Image.NEAREST)
        page.paste(big, ((2480 - 1700) // 2, 700))
        d = ImageDraw.Draw(page)
        try:
            f1, f2 = ImageFont.load_default(size=110), ImageFont.load_default(size=64)
        except TypeError:
            f1 = f2 = ImageFont.load_default()
        for y, text, f in ((300, qr.organization.name, f1), (470, ' / '.join(x for x in (qr.name, qr.location) if x), f2),
                           (2560, 'Fikringizni QR-kodni skanerlab yuboring', f2)):
            w = d.textlength(text, font=f)
            d.text(((2480 - w) / 2, y), text, fill='#0F172A', font=f)
        page.save(buf, 'PDF', resolution=300.0)
        return buf.getvalue(), 'application/pdf'
    img.save(buf, 'PNG')
    return buf.getvalue(), 'image/png'
