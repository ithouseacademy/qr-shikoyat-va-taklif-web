from django.urls import path
from . import views
urlpatterns = [
    path('integrations/telegram/', views.TelegramView.as_view()),
    path('integrations/email/', views.EmailView.as_view()),
]
