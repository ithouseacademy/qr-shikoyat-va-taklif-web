from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db.models import Q
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from apps.audit.services import audit_log
from apps.organizations.models import OrganizationMembership
from .models import User, normalize_phone
from .serializers import MeSerializer, RegisterSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        audit_log(request, 'register', user, org=None, entity='User')
        refresh = RefreshToken.for_user(user)
        return Response({'access': str(refresh.access_token), 'refresh': str(refresh), 'user': MeSerializer(user).data}, status=201)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        ident = str(request.data.get('login', '')).strip()
        pw = str(request.data.get('password', ''))
        user = User.objects.filter(Q(email__iexact=ident) | Q(phone=normalize_phone(ident))).first() if ident else None
        if not user or not user.is_active or not user.check_password(pw):
            return Response({'detail': 'Login yoki parol noto‘g‘ri'}, status=401)
        if not user.is_superuser:
            m = OrganizationMembership.objects.filter(user=user).select_related('organization').first()
            if not m:
                return Response({'detail': 'Foydalanuvchi tashkilotga biriktirilmagan'}, status=403)
            if m.organization.status != 'active':
                return Response({'detail': 'Tashkilot bloklangan yoki faol emas'}, status=403)
        refresh = RefreshToken.for_user(user)
        audit_log(request, 'login', user, org=None, entity='User')
        return Response({'access': str(refresh.access_token), 'refresh': str(refresh), 'user': MeSerializer(user).data})


class MeView(APIView):
    def get(self, request):
        return Response(MeSerializer(request.user).data)

    def patch(self, request):
        s = MeSerializer(request.user, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(MeSerializer(request.user).data)


class ChangePasswordView(APIView):
    def post(self, request):
        old, new = request.data.get('old_password', ''), request.data.get('new_password', '')
        if not request.user.check_password(old):
            return Response({'detail': 'Eski parol noto‘g‘ri'}, status=400)
        password_validation.validate_password(new, request.user)
        request.user.set_password(new)
        request.user.save()
        return Response({'detail': 'Parol yangilandi'})


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        user = User.objects.filter(email__iexact=str(request.data.get('email', '')).strip(), is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            send_mail('Parolni tiklash', f'Parolni tiklash uchun havola:\n{link}', settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
        # email mavjudligini oshkor qilmaymiz
        return Response({'detail': 'Agar email mavjud bo‘lsa, havola yuborildi'})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(request.data.get('uid', ''))))
        except Exception:
            return Response({'detail': 'Havola yaroqsiz'}, status=400)
        if not default_token_generator.check_token(user, request.data.get('token', '')):
            return Response({'detail': 'Havola yaroqsiz yoki eskirgan'}, status=400)
        pw = request.data.get('password', '')
        password_validation.validate_password(pw, user)
        user.set_password(pw)
        user.save()
        return Response({'detail': 'Parol yangilandi'})
