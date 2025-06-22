# backend/voting/management/commands/generate_system_keys.py
from django.core.management.base import BaseCommand
from cryptography.hazmat.primitives import serialization
# Assuming your CryptoUtils is in voting.crypto_utils
from e_voting.crypto_utils import crypto_utils 
import os
import base64

class Command(BaseCommand):
    help = 'Generates Ed25519 key pair for the system/election authority and saves them or prints them.'

    def handle(self, *args, **options):
        private_key, public_key = crypto_utils.generate_ed25519_key_pair()

        # Serialize private key to bytes (raw format for Ed25519 is common)
        private_key_bytes = private_key.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption()
        )

        # Serialize public key to bytes
        public_key_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )

        # For demo: Print base64 encoded keys to console.
        # In a real system, save private_key_bytes to a VERY secure file or HSM.
        # Public key can be stored more openly, e.g., in settings or a model.
        self.stdout.write(self.style.SUCCESS("Generated System Ed25519 Key Pair:"))
        self.stdout.write(f"Private Key (Base64 - SAVE THIS SECURELY, e.g., in .env or secure vault):")
        # VVVVVVVVVVVVVVVVVVVVVVVVVVVV  CORRECTED LINE VVVVVVVVVVVVVVVVVVVVVVVVVVVV
        self.stdout.write(base64.b64encode(private_key_bytes).decode()) 
        # ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  CORRECTED LINE ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        
        self.stdout.write(f"\nPublic Key (Base64 - Can be stored in settings.py or a public config):")
        # VVVVVVVVVVVVVVVVVVVVVVVVVVVV  CORRECTED LINE VVVVVVVVVVVVVVVVVVVVVVVVVVVV
        self.stdout.write(base64.b64encode(public_key_bytes).decode())
        # ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  CORRECTED LINE ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

        self.stdout.write(self.style.WARNING(
            "\nIMPORTANT: Store the private key in a highly secure location. "
            "For this demo, you might add it to your .env file."
        ))
        
        # Example: How you might want to save them to files (ensure secure permissions)
        # key_dir = os.path.join(settings.BASE_DIR, 'system_keys')
        # os.makedirs(key_dir, exist_ok=True)
        # with open(os.path.join(key_dir, 'system_ed25519_private.key'), 'wb') as f:
        #     f.write(private_key_bytes)
        # with open(os.path.join(key_dir, 'system_ed25519_public.key'), 'wb') as f:
        #     f.write(public_key_bytes)
        # self.stdout.write(f"Keys also conceptually saved to {key_dir} (ensure this is secure and NOT in Git).")