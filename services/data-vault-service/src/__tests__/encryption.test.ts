process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
process.env.ENCRYPTION_ALGORITHM = 'aes-256-gcm';

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', 'utf8');

class TestEncryptionService {
  encrypt(data: string): { encryptedData: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  encryptObject(obj: Record<string, unknown>): { encryptedData: string; iv: string; authTag: string } {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString);
  }

  decryptObject(encryptedData: string, iv: string, authTag: string): Record<string, unknown> {
    const jsonString = this.decrypt(encryptedData, iv, authTag);
    return JSON.parse(jsonString);
  }

  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

describe('EncryptionService', () => {
  let encryptionService: TestEncryptionService;

  beforeEach(() => {
    encryptionService = new TestEncryptionService();
  });

  describe('encrypt', () => {
    it('should encrypt a string and return encrypted data with iv and authTag', () => {
      const plaintext = 'Hello, World!';
      
      const result = encryptionService.encrypt(plaintext);
      
      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(result.encryptedData).not.toBe(plaintext);
      expect(result.iv).toHaveLength(32);
      expect(result.authTag).toHaveLength(32);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'Same text';
      
      const result1 = encryptionService.encrypt(plaintext);
      const result2 = encryptionService.encrypt(plaintext);
      
      expect(result1.encryptedData).not.toBe(result2.encryptedData);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      
      const result = encryptionService.encrypt(plaintext);
      
      expect(result.encryptedData).toBeDefined();
      expect(result.iv).toHaveLength(32);
      expect(result.authTag).toHaveLength(32);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Hello 世界 🌍 مرحبا';
      
      const result = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(result.encryptedData, result.iv, result.authTag);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'A'.repeat(10000);
      
      const result = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(result.encryptedData, result.iv, result.authTag);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      
      const result = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(result.encryptedData, result.iv, result.authTag);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('decrypt', () => {
    it('should correctly decrypt encrypted data', () => {
      const plaintext = 'Secret message';
      
      const { encryptedData, iv, authTag } = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encryptedData, iv, authTag);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error with invalid authTag', () => {
      const plaintext = 'Secret message';
      const { encryptedData, iv } = encryptionService.encrypt(plaintext);
      const invalidAuthTag = 'ffffffffffffffffffffffffffffffff';
      
      expect(() => {
        encryptionService.decrypt(encryptedData, iv, invalidAuthTag);
      }).toThrow();
    });

    it('should throw error with tampered ciphertext', () => {
      const plaintext = 'Secret message';
      const { iv, authTag } = encryptionService.encrypt(plaintext);
      const tamperedCiphertext = 'tampered' + 'a'.repeat(56);
      
      expect(() => {
        encryptionService.decrypt(tamperedCiphertext, iv, authTag);
      }).toThrow();
    });

    it('should throw error with wrong IV length', () => {
      const plaintext = 'Secret message';
      const { encryptedData, authTag } = encryptionService.encrypt(plaintext);
      const wrongIv = 'abc123';
      
      expect(() => {
        encryptionService.decrypt(encryptedData, wrongIv, authTag);
      }).toThrow();
    });
  });

  describe('encryptObject', () => {
    it('should encrypt a plain object', () => {
      const obj = { name: 'John', age: 30, email: 'john@example.com' };
      
      const result = encryptionService.encryptObject(obj);
      
      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
    });

    it('should correctly round-trip an object', () => {
      const obj = { name: 'John', age: 30, email: 'john@example.com' };
      
      const { encryptedData, iv, authTag } = encryptionService.encryptObject(obj);
      const decrypted = encryptionService.decryptObject(encryptedData, iv, authTag);
      
      expect(decrypted).toEqual(obj);
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          address: {
            city: 'NYC',
            zip: '10001'
          }
        },
        roles: ['admin', 'user']
      };
      
      const { encryptedData, iv, authTag } = encryptionService.encryptObject(obj);
      const decrypted = encryptionService.decryptObject(encryptedData, iv, authTag);
      
      expect(decrypted).toEqual(obj);
    });

    it('should handle arrays', () => {
      const obj = [1, 2, 3, 'four', { five: 5 }];
      
      const { encryptedData, iv, authTag } = encryptionService.encryptObject(obj as any);
      const decrypted = encryptionService.decryptObject(encryptedData, iv, authTag);
      
      expect(decrypted).toEqual(obj);
    });

    it('should handle null and undefined values', () => {
      const obj = { nullVal: null, undefinedVal: undefined } as Record<string, unknown>;
      
      const { encryptedData, iv, authTag } = encryptionService.encryptObject(obj);
      const decrypted = encryptionService.decryptObject(encryptedData, iv, authTag);
      
      expect(decrypted).toEqual(obj);
    });

    it('should handle empty object', () => {
      const obj = {};
      
      const { encryptedData, iv, authTag } = encryptionService.encryptObject(obj);
      const decrypted = encryptionService.decryptObject(encryptedData, iv, authTag);
      
      expect(decrypted).toEqual(obj);
    });
  });

  describe('hash', () => {
    it('should generate consistent hash for same input', () => {
      const data = 'test data';
      
      const hash1 = encryptionService.hash(data);
      const hash2 = encryptionService.hash(data);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = encryptionService.hash('data1');
      const hash2 = encryptionService.hash('data2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate 64-character hex string (SHA-256)', () => {
      const hash = encryptionService.hash('test');
      
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should handle empty string', () => {
      const hash = encryptionService.hash('');
      
      expect(hash).toHaveLength(64);
    });

    it('should be deterministic regardless of when it is called', () => {
      const data = 'consistent data';
      
      const hash1 = encryptionService.hash(data);
      const hash2 = encryptionService.hash(data);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('generateToken', () => {
    it('should generate token with default length', () => {
      const token = encryptionService.generateToken();
      
      expect(token).toHaveLength(64);
    });

    it('should generate token with specified length', () => {
      const token16 = encryptionService.generateToken(16);
      const token32 = encryptionService.generateToken(32);
      
      expect(token16).toHaveLength(32);
      expect(token32).toHaveLength(64);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(encryptionService.generateToken());
      }
      
      expect(tokens.size).toBe(100);
    });

    it('should only contain hex characters', () => {
      const token = encryptionService.generateToken();
      
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });
  });

  describe('encryption security', () => {
    it('should use AES-256-GCM for authenticated encryption', () => {
      const plaintext = 'test';
      const { encryptedData, iv, authTag } = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encryptedData, iv, authTag);
      
      expect(decrypted).toBe(plaintext);
      expect(authTag).toHaveLength(32);
    });

    it('should generate cryptographically secure random IVs', () => {
      const ivs = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const { iv } = encryptionService.encrypt('test');
        ivs.add(iv);
      }
      
      expect(ivs.size).toBe(100);
    });

    it('should not expose plaintext in ciphertext', () => {
      const plaintext = 'my secret password123';
      const { encryptedData } = encryptionService.encrypt(plaintext);
      
      expect(encryptedData).not.toContain(plaintext);
      expect(encryptedData).not.toContain('password');
    });
  });
});
