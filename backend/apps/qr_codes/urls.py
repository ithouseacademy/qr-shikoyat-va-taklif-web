from rest_framework.routers import DefaultRouter
from .views import QRCodeViewSet
router = DefaultRouter()
router.register('qr-codes', QRCodeViewSet, basename='qr-codes')
urlpatterns = router.urls
