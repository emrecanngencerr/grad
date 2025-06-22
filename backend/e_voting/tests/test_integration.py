import unittest
import json
import base64
from ..crypto_utils import crypto_utils

class TestCryptoIntegration(unittest.TestCase):
    def setUp(self):
        self.test_vote = {
            'candidate_id': '123',
            'election_id': '456',
            'timestamp': '2024-03-20T12:00:00Z'
        }
        # Generate election keys
        self.election_private_key, self.election_public_key = crypto_utils.generate_key_pair()
        # Generate voter keys
        self.voter_private_key, self.voter_public_key = crypto_utils.generate_key_pair()

    def test_vote_lifecycle(self):
        """Test the complete lifecycle of a vote"""
        # 1. Generate vote commitment
        nonce = crypto_utils.generate_secure_random(1, 1000000)
        commitment = crypto_utils.generate_vote_commitment(self.test_vote, nonce)
        
        # 2. Sign the vote with voter's private key
        signature = crypto_utils.sign_data(self.test_vote, self.voter_private_key)
        
        # 3. Encrypt the vote with election public key
        encrypted_vote = crypto_utils.encrypt_vote(self.test_vote, self.election_public_key)
        
        # 4. Verify the signature
        is_signature_valid = crypto_utils.verify_signature(
            self.test_vote,
            signature,
            self.voter_public_key
        )
        self.assertTrue(is_signature_valid)
        
        # 5. Decrypt the vote
        decrypted_vote = crypto_utils.decrypt_vote(encrypted_vote, self.election_private_key)
        self.assertEqual(decrypted_vote, self.test_vote)
        
        # 6. Verify the commitment
        is_commitment_valid = crypto_utils.verify_vote_commitment(
            commitment,
            decrypted_vote,
            nonce
        )
        self.assertTrue(is_commitment_valid)

    def test_vote_tampering_detection(self):
        """Test detection of vote tampering"""
        # 1. Create and encrypt original vote
        encrypted_vote = crypto_utils.encrypt_vote(self.test_vote, self.election_public_key)
        
        # 2. Try to modify encrypted vote
        modified_encrypted = encrypted_vote.copy()
        modified_encrypted['ciphertext'] = 'modified' + modified_encrypted['ciphertext']
        
        # 3. Attempt decryption should fail
        with self.assertRaises(Exception):
            crypto_utils.decrypt_vote(modified_encrypted, self.election_private_key)

    def test_vote_commitment_integrity(self):
        """Test vote commitment integrity"""
        # 1. Create vote commitment
        nonce = crypto_utils.generate_secure_random(1, 1000000)
        commitment = crypto_utils.generate_vote_commitment(self.test_vote, nonce)
        
        # 2. Try to modify vote after commitment
        modified_vote = self.test_vote.copy()
        modified_vote['candidate_id'] = '789'
        
        # 3. Verify commitment should fail
        is_valid = crypto_utils.verify_vote_commitment(
            commitment,
            modified_vote,
            nonce
        )
        self.assertFalse(is_valid)

    def test_multiple_votes(self):
        """Test handling multiple votes"""
        votes = []
        for i in range(5):
            vote = {
                'candidate_id': str(i),
                'election_id': '456',
                'timestamp': '2024-03-20T12:00:00Z'
            }
            nonce = crypto_utils.generate_secure_random(1, 1000000)
            commitment = crypto_utils.generate_vote_commitment(vote, nonce)
            encrypted = crypto_utils.encrypt_vote(vote, self.election_public_key)
            signature = crypto_utils.sign_data(vote, self.voter_private_key)
            
            votes.append({
                'vote': vote,
                'encrypted': encrypted,
                'commitment': commitment,
                'nonce': nonce,
                'signature': signature
            })
        
        # Verify all votes
        for vote_data in votes:
            # Verify signature
            is_signature_valid = crypto_utils.verify_signature(
                vote_data['vote'],
                vote_data['signature'],
                self.voter_public_key
            )
            self.assertTrue(is_signature_valid)
            
            # Verify commitment
            is_commitment_valid = crypto_utils.verify_vote_commitment(
                vote_data['commitment'],
                vote_data['vote'],
                vote_data['nonce']
            )
            self.assertTrue(is_commitment_valid)
            
            # Verify encryption/decryption
            decrypted = crypto_utils.decrypt_vote(
                vote_data['encrypted'],
                self.election_private_key
            )
            self.assertEqual(decrypted, vote_data['vote'])

if __name__ == '__main__':
    unittest.main() 