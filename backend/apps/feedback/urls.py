from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('feedbacks', views.FeedbackViewSet, basename='feedbacks')
router.register('categories', views.CategoryViewSet, basename='categories')
urlpatterns = [
    path('public/qr/<str:token>/', views.PublicQRView.as_view()),
    path('public/qr/<str:token>/feedback/', views.PublicSubmitView.as_view()),
    path('public/track/<str:number>/', views.PublicTrackView.as_view()),
] + router.urls
