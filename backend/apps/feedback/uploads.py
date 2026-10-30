import uuid
from PIL import Image
from rest_framework.exceptions import ValidationError

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_VIDEO_BYTES = 20 * 1024 * 1024
ALLOWED_IMAGES = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp'}
VIDEO_EXTENSIONS = {'mp4', 'webm', 'mov', 'm4v', 'ogg'}


def _fail(message):
    raise ValidationError({'attachments': message})


def validate_image(f):
    """Haqiqiy rasm ekanini Pillow bilan tekshiradi, nomni tasodifiy qiladi."""
    if f.size > MAX_IMAGE_BYTES:
        _fail('Rasm hajmi 5MB dan oshmasin')
    try:
        img = Image.open(f)
        fmt = img.format
        img.verify()
    except Exception:
        _fail('Faqat rasm fayllari qabul qilinadi')
    if fmt not in ALLOWED_IMAGES:
        _fail('Faqat JPG, PNG yoki WEBP')
    f.seek(0)
    f.name = f'{uuid.uuid4().hex}.{ALLOWED_IMAGES[fmt]}'
    return f


def _extension(name):
    return name.rsplit('.', 1)[-1].lower() if '.' in name else ''


def _is_image(f):
    ext = _extension(f.name)
    ctype = (getattr(f, 'content_type', '') or '').lower()
    return ext in ALLOWED_IMAGES.values() or ctype.startswith('image/')


def validate_attachment(f):
    """Rasm yoki videoni tekshiradi va xavfsiz nom beradi."""
    ext = _extension(f.name)
    ctype = (getattr(f, 'content_type', '') or '').lower()
    if _is_image(f):
        return validate_image(f)
    if ext in VIDEO_EXTENSIONS or ctype.startswith('video/'):
        if ext not in VIDEO_EXTENSIONS:
            _fail('Video formati MP4, WEBM yoki MOV bo‘lsin')
        if f.size > MAX_VIDEO_BYTES:
            _fail('Video hajmi 20MB dan oshmasin')
        f.name = f'{uuid.uuid4().hex}.{ext}'
        return f
    _fail('Faqat rasm yoki video biriktirish mumkin')


def validate_attachments(files):
    """3 tagacha rasm va 1 tagacha video ruxsat etiladi."""
    images = sum(1 for f in files if _is_image(f))
    videos = len(files) - images
    if images > 3:
        _fail('Ko‘pi bilan 3 ta rasm biriktirish mumkin')
    if videos > 1:
        _fail('Faqat 1 ta video biriktirish mumkin')
    for f in files:
        validate_attachment(f)
    return files
