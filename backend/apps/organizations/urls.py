from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('staff', views.MembershipViewSet, basename='staff')
router.register('admin/organizations', views.AdminOrganizationViewSet, basename='admin-orgs')
router.register('admin/users', views.AdminUserViewSet, basename='admin-users')
urlpatterns = [
    path('organization/', views.OrganizationView.as_view()),
    path('admin/stats/', views.AdminStatsView.as_view()),
] + router.urls
