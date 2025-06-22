from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.hazmat.primitives.asymmetric import rsa
import os
import json
import base64
from datetime import datetime
from django.conf import settings

class CryptoUtils:
    def __init__(self):
        self.backend = default_backend()
        self.hash_algorithm = hashes.SHA3_256()
        self.salt_length = 16
        self.key_length = 32
        self.iv_length = 16

    def generate_ed25519_key_pair(self):
        """Generate an Ed25519 key pair for digital signatures"""
        private_key = Ed25519PrivateKey.generate()
        public_key = private_key.public_key()
        return private_key, public_key

    def generate_rsa_key_pair(self):
        """Generate an RSA key pair for encryption/decryption"""
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=self.backend
        )
        public_key = private_key.public_key()
        return private_key, public_key

    def sign_data(self, data, private_key):
        """Sign data using Ed25519"""
        signature = private_key.sign(json.dumps(data).encode())
        return base64.b64encode(signature).decode()

    def verify_signature(self, data, signature, public_key):
        """Verify Ed25519 signature"""
        try:
            public_key.verify(
                base64.b64decode(signature),
                json.dumps(data).encode()
            )
            return True
        except Exception:
            return False

    def encrypt_vote(self, vote_data, public_key):
        """Encrypt vote data using hybrid encryption (RSA + AES)"""
        # Generate a random AES key
        aes_key = os.urandom(32)
        iv = os.urandom(16)

        # Encrypt the vote data with AES
        cipher = Cipher(
            algorithms.AES(aes_key),
            modes.GCM(iv),
            backend=self.backend
        )
        encryptor = cipher.encryptor()
        
        # Encrypt the data
        ciphertext = encryptor.update(json.dumps(vote_data).encode()) + encryptor.finalize()

        # Encrypt the AES key with RSA
        encrypted_key = public_key.encrypt(
            aes_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )

        return {
            'encrypted_key': base64.b64encode(encrypted_key).decode(),
            'iv': base64.b64encode(iv).decode(),
            'ciphertext': base64.b64encode(ciphertext).decode(),
            'tag': base64.b64encode(encryptor.tag).decode()
        }

    def decrypt_vote(self, encrypted_data, private_key):
        """Decrypt vote data using RSA private key"""
        # Decrypt the AES key
        encrypted_key = base64.b64decode(encrypted_data['encrypted_key'])
        aes_key = private_key.decrypt(
            encrypted_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )

        # Decrypt the vote data
        iv = base64.b64decode(encrypted_data['iv'])
        ciphertext = base64.b64decode(encrypted_data['ciphertext'])
        tag = base64.b64decode(encrypted_data['tag'])

        cipher = Cipher(
            algorithms.AES(aes_key),
            modes.GCM(iv, tag),
            backend=self.backend
        )
        decryptor = cipher.decryptor()

        # Decrypt and verify
        plaintext = decryptor.update(ciphertext) + decryptor.finalize()
        return json.loads(plaintext.decode())

    def generate_vote_commitment(self, vote_data, nonce):
        """Generate a commitment for a vote"""
        commitment_data = {
            'vote': vote_data,
            'nonce': nonce
        }
        
        digest = hashes.Hash(self.hash_algorithm, backend=self.backend)
        digest.update(json.dumps(commitment_data).encode())
        return base64.b64encode(digest.finalize()).decode()

    def verify_vote_commitment(self, commitment, vote_data, nonce):
        """Verify a vote commitment"""
        calculated_commitment = self.generate_vote_commitment(vote_data, nonce)
        return commitment == calculated_commitment

    def generate_secure_random(self, min_value, max_value):
        """Generate a cryptographically secure random number in range"""
        range_size = max_value - min_value
        bits_needed = range_size.bit_length()
        bytes_needed = (bits_needed + 7) // 8
        
        while True:
            random_bytes = os.urandom(bytes_needed)
            random_int = int.from_bytes(random_bytes, byteorder='big')
            if random_int < (2 ** bits_needed - 2 ** bits_needed % range_size):
                return min_value + (random_int % range_size)
    def get_system_ed25519_private_key(self):
        if not settings.SYSTEM_ED25519_PRIVATE_KEY_B64:
            raise ValueError("System Ed25519 private key not configured in settings.")
        private_key_bytes = base64.b64decode(settings.SYSTEM_ED25519_PRIVATE_KEY_B64)
        return Ed25519PrivateKey.from_private_bytes(private_key_bytes)

    def get_system_ed25519_public_key(self):
        if not settings.SYSTEM_ED25519_PUBLIC_KEY_B64:
            raise ValueError("System Ed25519 public key not configured in settings.")
        public_key_bytes = base64.b64decode(settings.SYSTEM_ED25519_PUBLIC_KEY_B64)
        return Ed25519PublicKey.from_public_bytes(public_key_bytes)

# Create a singleton instance
crypto_utils = CryptoUtils() 