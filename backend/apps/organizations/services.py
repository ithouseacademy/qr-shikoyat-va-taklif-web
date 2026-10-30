import secrets
from django.utils.text import slugify
from .models import Organization, OrganizationMembership, OrganizationSettings, ROLE_OWNER

RESERVED = {'admin', 'api', 'login', 'register', 'super', 'app', 'media', 'static', 'ws', 'offline', 'reset-password', 'forgot-password'}


def unique_slug(name):
    base = slugify(name)[:50] or 'org'
    slug = base
    while slug in RESERVED or Organization.objects.filter(slug=slug).exists():
        slug = f'{base}-{secrets.token_hex(2)}'
    return slug


def create_organization(name, owner):
    from apps.feedback.models import FeedbackCategory
    org = Organization.objects.create(name=name, slug=unique_slug(name))
    OrganizationSettings.objects.create(organization=org)
    OrganizationMembership.objects.create(user=owner, organization=org, role=ROLE_OWNER)
    defaults = [('Xizmat sifati', 'both'), ('Xodimlar xulq-atvori', 'both'), ('Tozalik', 'both'),
                ('Narx', 'both'), ('Kutish vaqti', 'complaint'), ('Yangi g‘oya', 'suggestion'), ('Boshqa', 'both')]
    FeedbackCategory.objects.bulk_create([FeedbackCategory(organization=org, name=n, kind=k) for n, k in defaults])
    return org
