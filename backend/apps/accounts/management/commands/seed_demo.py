import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User
from apps.branches.models import Branch
from apps.departments.models import Department
from apps.feedback.models import Feedback, FeedbackCategory, FeedbackStatusHistory
from apps.organizations.models import OrganizationMembership
from apps.organizations.services import create_organization
from apps.qr_codes.models import QRCode, QRScan


class Command(BaseCommand):
    help = 'Demo ma‘lumotlar: super admin, 2 ta tashkilot (Marokand, WEBSTORM), filial, bo‘lim, QR, murojaatlar'

    def handle(self, *a, **kw):
        if not User.objects.filter(email='super@feedback.uz').exists():
            User.objects.create_superuser('super@feedback.uz', 'Super12345!', full_name='Super Admin')
        for name, mail, phone in (('Marokand', 'owner@marokand.uz', '+998901112233'), ('WEBSTORM', 'owner@webstorm.uz', '+998909998877')):
            if User.objects.filter(email=mail).exists():
                continue
            owner = User.objects.create_user(mail, 'Demo12345!', full_name=f'{name} rahbari', phone=phone)
            org = create_organization(name, owner)
            for em, role in ((f'manager@{org.slug}.uz', 'manager'), (f'employee@{org.slug}.uz', 'employee')):
                u = User.objects.create_user(em, 'Demo12345!', full_name=f'{name} {role}')
                OrganizationMembership.objects.create(user=u, organization=org, role=role)
            branches = [Branch.objects.create(organization=org, name=n, address='Toshkent') for n in ('Markaziy filial', 'Chilonzor filiali')]
            depts = [Department.objects.create(organization=org, branch=b, name=n) for b in branches for n in ('Savdo bo‘limi', 'Xizmat ko‘rsatish')]
            qrs = [QRCode.objects.create(organization=org, branch=d.branch, department=d, name=f'{d.name} QR', location='Kirish qismi') for d in depts]
            cats = list(FeedbackCategory.objects.filter(organization=org))
            staff = list(User.objects.filter(memberships__organization=org))
            for q in qrs:
                QRScan.objects.bulk_create([QRScan(qr=q, organization=org) for _ in range(random.randint(10, 40))])
            for i in range(60):
                q = random.choice(qrs)
                t = random.choices(['suggestion', 'complaint', 'rating'], [3, 4, 3])[0]
                st = random.choice(['new', 'in_progress', 'answered', 'resolved', 'rejected'])
                created = timezone.now() - timedelta(days=random.randint(0, 29), hours=random.randint(0, 20))
                fb = Feedback.objects.create(organization=org, qr=q, branch=q.branch, department=q.department, type=t,
                                             category=random.choice(cats) if t != 'rating' else None,
                                             name=random.choice(['', 'Aziz', 'Dilnoza', 'Jasur', '']), text='' if t == 'rating' else 'Demo murojaat matni, xizmat haqida fikr.',
                                             rating=random.randint(1, 5) if t == 'rating' else None, status=st,
                                             assigned_to=random.choice(staff) if st != 'new' else None)
                Feedback.objects.filter(pk=fb.pk).update(created_at=created, resolved_at=created + timedelta(hours=random.randint(1, 48)) if st in ('resolved', 'rejected') else None)
                FeedbackStatusHistory.objects.create(feedback=fb, to_status='new', note='Demo')
            self.stdout.write(self.style.SUCCESS(f'{name}: {mail} / Demo12345!  | demo QR: {qrs[0].public_url}'))
        self.stdout.write(self.style.SUCCESS('Super admin: super@feedback.uz / Super12345!'))
