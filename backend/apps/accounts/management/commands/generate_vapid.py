import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'VAPID kalitlarini yaratadi (.env ga qo‘ying)'

    def handle(self, *a, **kw):
        key = ec.generate_private_key(ec.SECP256R1())
        b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b'=').decode()
        priv = b64(key.private_numbers().private_value.to_bytes(32, 'big'))
        pub = b64(key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint))
        self.stdout.write(f'VAPID_PUBLIC_KEY={pub}\nVAPID_PRIVATE_KEY={priv}')
