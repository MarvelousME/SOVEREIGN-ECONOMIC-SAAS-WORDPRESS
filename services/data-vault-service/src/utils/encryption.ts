import crypto from 'crypto';
import { config } from '../config';

/**
 * Encryption utility for data vault
 * Uses AES-256-GCM for authenticated encryption
 */
export class EncryptionService {
  private algorithm: string;
  private key: Buffer;

  constructor() {
    this.algorithm = config.encryption.algorithm;
    
    // Ensure key is 32 bytes for AES-256
    const keyString = config.encryption.key;
    if (keyString.length !== 32) {
      throw new Error('Encryption key must be exactly 32 bytes for AES-256');
    }
    this.key = Buffer.from(keyString, 'utf8');
  }

  /**
   * Encrypt data
   */
  encrypt(data: string): { encryptedData: string; iv: string; authTag: string } {
    // Generate random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData: string, iv: string, authTag: string): string {
    // Create decipher
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    );
    
    // Set authentication tag
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    // Decrypt data
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Encrypt object (converts to JSON first)
   */
  encryptObject(obj: any): { encryptedData: string; iv: string; authTag: string } {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString);
  }

  /**
   * Decrypt to object (parses JSON after decryption)
   */
  decryptObject(encryptedData: string, iv: string, authTag: string): any {
    const jsonString = this.decrypt(encryptedData, iv, authTag);
    return JSON.parse(jsonString);
  }

  /**
   * Generate hash for data integrity verification
   */
  hash(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Generate secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

export const encryptionService = new EncryptionService();
