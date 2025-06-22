import unittest
import json
from ..crypto_utils import crypto_utils

class TestCryptoUtils(unittest.TestCase):
    def setUp(self):
        self.test_data = {
            'candidate_id': '123',
            'election_id': '456',
            'timestamp': '2024-03-20T12:00:00Z'
        }

    def test_ed25519_key_pair_generation(self):
        """Test Ed25519 key pair generation"""
        private_key, public_key = crypto_utils.generate_ed25519_key_pair()
        self.assertIsNotNone(private_key)
        self.assertIsNotNone(public_key)

    def test_signature_verification(self):
        """Test digital signature creation and verification"""
        private_key, public_key = crypto_utils.generate_ed25519_key_pair()
        
        # Sign data
        signature = crypto_utils.sign_data(self.test_data, private_key)
        self.assertIsNotNone(signature)
        
        # Verify signature
        is_valid = crypto_utils.verify_signature(self.test_data, signature, public_key)
        self.assertTrue(is_valid)
        
        # Test invalid signature
        modified_data = self.test_data.copy()
        modified_data['candidate_id'] = '789'
        is_invalid = crypto_utils.verify_signature(modified_data, signature, public_key)
        self.assertFalse(is_invalid)

    def test_vote_encryption_decryption(self):
        """Test vote encryption and decryption using RSA"""
        # Generate RSA key pair for testing
        private_key, public_key = crypto_utils.generate_rsa_key_pair()
        
        # Encrypt vote
        encrypted_vote = crypto_utils.encrypt_vote(self.test_data, public_key)
        self.assertIn('encrypted_key', encrypted_vote)
        self.assertIn('iv', encrypted_vote)
        self.assertIn('ciphertext', encrypted_vote)
        self.assertIn('tag', encrypted_vote)
        
        # Decrypt vote
        decrypted_vote = crypto_utils.decrypt_vote(encrypted_vote, private_key)
        self.assertEqual(decrypted_vote, self.test_data)

    def test_vote_commitment(self):
        """Test vote commitment generation and verification"""
        nonce = 12345
        
        # Generate commitment
        commitment = crypto_utils.generate_vote_commitment(self.test_data, nonce)
        self.assertIsNotNone(commitment)
        
        # Verify commitment
        is_valid = crypto_utils.verify_vote_commitment(
            commitment, 
            self.test_data, 
            nonce
        )
        self.assertTrue(is_valid)
        
        # Test invalid commitment
        modified_data = self.test_data.copy()
        modified_data['candidate_id'] = '789'
        is_invalid = crypto_utils.verify_vote_commitment(
            commitment, 
            modified_data, 
            nonce
        )
        self.assertFalse(is_invalid)

    def test_secure_random(self):
        """Test secure random number generation"""
        min_value = 1
        max_value = 100
        
        # Generate multiple random numbers
        random_numbers = set()
        for _ in range(100):
            random_num = crypto_utils.generate_secure_random(min_value, max_value)
            self.assertGreaterEqual(random_num, min_value)
            self.assertLess(random_num, max_value)
            random_numbers.add(random_num)
        
        # Check distribution (should have at least 50 unique numbers)
        self.assertGreaterEqual(len(random_numbers), 50)

    def test_error_handling(self):
        """Test error handling in cryptographic operations"""
        rsa_private_key, rsa_public_key = crypto_utils.generate_rsa_key_pair()
        
        # Test invalid decryption
        invalid_encrypted_data = {
            'encrypted_key': 'invalid',
            'iv': 'invalid',
            'ciphertext': 'invalid',
            'tag': 'invalid'
        }
        with self.assertRaises(Exception):
            crypto_utils.decrypt_vote(invalid_encrypted_data, rsa_private_key)

if __name__ == '__main__':
    unittest.main() 