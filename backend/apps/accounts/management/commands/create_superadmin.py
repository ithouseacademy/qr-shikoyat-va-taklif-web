import os

from django.core.management.base import BaseCommand, CommandError
from apps.accounts.models import User


class Command(BaseCommand):
    help = 'Super admin yaratadi yoki mavjudini yangilaydi (env yoki argument orqali)'

    def add_arguments(self, parser):
        parser.add_argument('--email', default=os.environ.get('SUPERADMIN_EMAIL'))
        parser.add_argument('--password', default=os.environ.get('SUPERADMIN_PASSWORD'))
        parser.add_argument('--name', default=os.environ.get('SUPERADMIN_NAME', 'Super Admin'))
        parser.add_argument('--quiet', action='store_true')

    def handle(self, *args, **opts):
        email = (opts['email'] or '').strip().lower()
        password = opts['password'] or ''
        if not email or not password:
            raise CommandError('SUPERADMIN_EMAIL va SUPERADMIN_PASSWORD kerak (env yoki --email/--password)')

        user = User.objects.filter(email__iexact=email).first()
        if user:
            user.is_superuser = True
            user.is_staff = True
            user.is_active = True
            user.set_password(password)
            user.save(update_fields=['is_superuser', 'is_staff', 'is_active', 'password'])
            action = 'yangilandi'
        else:
            User.objects.create_superuser(email, password, full_name=opts['name'])
            action = 'yaratildi'

        if not opts['quiet']:
            self.stdout.write(self.style.SUCCESS(f'Super admin {action}: {email}'))
