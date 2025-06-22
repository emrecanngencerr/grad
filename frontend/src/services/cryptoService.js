import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

class CryptoService {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32; // 256 bits
        this.ivLength = 16;  // 128 bits
        this.saltLength = 64;
        this.tagLength = 16;
    }

    // Generate a secure random key
    generateKey() {
        return randomBytes(this.keyLength);
    }

    // Generate a secure random IV
    generateIV() {
        return randomBytes(this.ivLength);
    }

    // Encrypt data using AES-GCM
    encrypt(data, key) {
        const iv = this.generateIV();
        const cipher = createCipheriv(this.algorithm, key, iv);
        
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const tag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            tag: tag.toString('hex')
        };
    }

    // Decrypt data using AES-GCM
    decrypt(encryptedData, key) {
        const decipher = createDecipheriv(
            this.algorithm,
            key,
            Buffer.from(encryptedData.iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    }

    // Generate a secure hash of data
    hash(data) {
        return createHash('sha3-256')
            .update(JSON.stringify(data))
            .digest('hex');
    }

    // Generate a secure random number
    generateRandomNumber(min, max) {
        const range = max - min;
        const bytesNeeded = Math.ceil(Math.log2(range) / 8);
        const maxNum = Math.pow(256, bytesNeeded);
        const maxRange = maxNum - (maxNum % range);

        let value;
        do {
            const randomBytes = this.generateKey().slice(0, bytesNeeded);
            value = 0;
            for (let i = 0; i < bytesNeeded; i++) {
                value = (value * 256) + randomBytes[i];
            }
        } while (value >= maxRange);

        return min + (value % range);
    }

    // Generate a vote commitment
    generateVoteCommitment(vote, nonce) {
        const timestamp = Date.now();
        const commitmentData = {
            vote,
            nonce,
            timestamp
        };
        return {
            commitment: this.hash(commitmentData),
            timestamp
        };
    }

    // Verify a vote commitment
    verifyVoteCommitment(commitmentData, vote, nonce) {
        const { commitment, timestamp } = commitmentData;
        const verificationData = {
            vote,
            nonce,
            timestamp
        };
        const calculatedCommitment = this.hash(verificationData);
        return commitment === calculatedCommitment;
    }
}

export default new CryptoService(); 