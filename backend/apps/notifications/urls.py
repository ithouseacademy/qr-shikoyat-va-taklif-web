from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('notifications', views.NotificationViewSet, basename='notifications')
urlpatterns = [
    path('notification-preferences/', views.PreferenceView.as_view()),
    path('push/vapid-key/', views.VapidKeyView.as_view()),
    path('push/subscribe/', views.SubscribeView.as_view()),
    path('push/unsubscribe/', views.UnsubscribeView.as_view()),
    path('push/devices/', views.MyDevicesView.as_view()),
] + router.urls
