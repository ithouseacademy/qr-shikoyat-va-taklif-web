from django.test import override_settings
from rest_framework.test import APIClient, APITestCase
from apps.accounts.models import User
from apps.organizations.services import create_organization
from apps.qr_codes.models import QRCode
from .models import Feedback


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class TenantAndPublicTests(APITestCase):
    def setUp(self):
        self.u1 = User.objects.create_user('a@a.uz', 'Pass12345!', full_name='A', phone='+998900000001')
        self.u2 = User.objects.create_user('b@b.uz', 'Pass12345!', full_name='B', phone='+998900000002')
        self.o1 = create_organization('Org One', self.u1)
        self.o2 = create_organization('Org Two', self.u2)
        self.qr1 = QRCode.objects.create(organization=self.o1, name='q1')
        self.qr2 = QRCode.objects.create(organization=self.o2, name='q2')

    def login(self, email):
        c = APIClient()
        r = c.post('/api/auth/login/', {'login': email, 'password': 'Pass12345!'}, format='json')
        self.assertEqual(r.status_code, 200)
        c.credentials(HTTP_AUTHORIZATION='Bearer ' + r.data['access'])
        return c

    def submit(self, qr, key=None, **extra):
        h = {'HTTP_IDEMPOTENCY_KEY': key} if key else {}
        return APIClient().post(f'/api/public/qr/{qr.token}/feedback/', {'type': 'complaint', 'text': 'Xizmat yomon edi', **extra}, format='json', **h)

    def test_anonymous_submit_and_tenant_isolation(self):
        self.assertEqual(self.submit(self.qr1).status_code, 201)
        self.assertEqual(self.submit(self.qr2).status_code, 201)
        r = self.login('a@a.uz').get('/api/feedbacks/')
        self.assertEqual(r.data['count'], 1)
        fb2 = Feedback.objects.get(organization=self.o2)
        self.assertEqual(self.login('a@a.uz').get(f'/api/feedbacks/{fb2.id}/').status_code, 404)
        self.assertEqual(self.login('a@a.uz').post(f'/api/feedbacks/{fb2.id}/set_status/', {'status': 'resolved'}, format='json').status_code, 404)

    def test_idempotency(self):
        a = self.submit(self.qr1, key='abc-123')
        b = self.submit(self.qr1, key='abc-123')
        self.assertEqual(a.status_code, 201)
        self.assertEqual(b.status_code, 200)
        self.assertEqual(a.data['number'], b.data['number'])
        self.assertEqual(Feedback.objects.filter(organization=self.o1).count(), 1)

    def test_inactive_qr_rejected(self):
        self.qr1.is_active = False
        self.qr1.save()
        self.assertEqual(self.submit(self.qr1).status_code, 404)

    def test_anonymous_cannot_use_admin_api(self):
        self.assertEqual(APIClient().get('/api/feedbacks/').status_code, 401)

    def test_cannot_link_other_org_branch(self):
        from apps.branches.models import Branch
        b2 = Branch.objects.create(organization=self.o2, name='x')
        r = self.login('a@a.uz').post('/api/qr-codes/', {'name': 'bad', 'branch': b2.id}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_blocked_org_cannot_login(self):
        self.o1.status = 'blocked'
        self.o1.save()
        r = APIClient().post('/api/auth/login/', {'login': 'a@a.uz', 'password': 'Pass12345!'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_employee_sees_only_assigned(self):
        from apps.organizations.models import OrganizationMembership
        emp = User.objects.create_user('e@a.uz', 'Pass12345!', full_name='E')
        OrganizationMembership.objects.create(user=emp, organization=self.o1, role='employee')
        self.submit(self.qr1)
        self.assertEqual(self.login('e@a.uz').get('/api/feedbacks/').data['count'], 0)
        fb = Feedback.objects.get(organization=self.o1)
        r = self.login('a@a.uz').post(f'/api/feedbacks/{fb.id}/assign/', {'user_id': emp.id}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.login('e@a.uz').get('/api/feedbacks/').data['count'], 1)
