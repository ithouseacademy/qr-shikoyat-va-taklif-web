from django.urls import path
from .views import AuditLogListView
urlpatterns = [path('admin/audit/', AuditLogListView.as_view())]
