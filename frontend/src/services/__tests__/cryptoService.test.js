import cryptoService from '../cryptoService';

describe('CryptoService', () => {
    // Test key generation
    test('should generate a valid key', () => {
        const key = cryptoService.generateKey();
        expect(key).toBeDefined();
        expect(key.length).toBe(32); // 256 bits = 32 bytes
    });

    // Test IV generation
    test('should generate a valid IV', () => {
        const iv = cryptoService.generateIV();
        expect(iv).toBeDefined();
        expect(iv.length).toBe(16); // 128 bits = 16 bytes
    });

    // Test encryption and decryption
    test('should encrypt and decrypt data correctly', () => {
        const testData = {
            message: 'Test vote data',
            timestamp: Date.now()
        };
        const key = cryptoService.generateKey();

        // Encrypt
        const encrypted = cryptoService.encrypt(testData, key);
        expect(encrypted).toHaveProperty('encrypted');
        expect(encrypted).toHaveProperty('iv');
        expect(encrypted).toHaveProperty('tag');

        // Decrypt
        const decrypted = cryptoService.decrypt(encrypted, key);
        expect(decrypted).toEqual(testData);
    });

    // Test hashing
    test('should generate consistent hashes', () => {
        const testData = { vote: 'test', nonce: 123 };
        const hash1 = cryptoService.hash(testData);
        const hash2 = cryptoService.hash(testData);
        expect(hash1).toBe(hash2);
    });

    // Test random number generation
    test('should generate random numbers within range', () => {
        const min = 1;
        const max = 100;
        const random = cryptoService.generateRandomNumber(min, max);
        expect(random).toBeGreaterThanOrEqual(min);
        expect(random).toBeLessThan(max);
    });

    // Test vote commitment
    test('should generate and verify vote commitments', () => {
        const vote = { candidateId: '123', electionId: '456' };
        const nonce = cryptoService.generateRandomNumber(1, 1000000);
        
        // Generate commitment
        const commitmentData = cryptoService.generateVoteCommitment(vote, nonce);
        expect(commitmentData).toHaveProperty('commitment');
        expect(commitmentData).toHaveProperty('timestamp');
        
        // Verify commitment
        const isValid = cryptoService.verifyVoteCommitment(commitmentData, vote, nonce);
        expect(isValid).toBe(true);
        
        // Test invalid commitment
        const invalidVote = { ...vote, candidateId: '789' };
        const isInvalid = cryptoService.verifyVoteCommitment(commitmentData, invalidVote, nonce);
        expect(isInvalid).toBe(false);
    });

    // Test error handling
    test('should handle invalid encryption/decryption gracefully', () => {
        const testData = { message: 'Test' };
        const key = cryptoService.generateKey();
        const wrongKey = cryptoService.generateKey();

        const encrypted = cryptoService.encrypt(testData, key);
        
        // Try to decrypt with wrong key
        expect(() => {
            cryptoService.decrypt(encrypted, wrongKey);
        }).toThrow();
    });
}); 