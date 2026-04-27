import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private static instance: EncryptionService;
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>('DB_ENCRYPTION_KEY');
    if (!secret || secret.length !== 64) {
      // Expecting a 64-char hex string for a 32-byte key
      throw new InternalServerErrorException(
        'DB_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
      );
    }
    this.key = Buffer.from(secret, 'hex');
    EncryptionService.instance = this;
  }

  static getInstance(): EncryptionService {
    return EncryptionService.instance;
  }

  /**
   * Encrypts a string value using AES-256-GCM.
   * Format: iv:authTag:ciphertext (all hex encoded)
   */
  encrypt(value: string): string {
    if (!value) return value;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv) as crypto.CipherGCM;

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts a string value.
   */
  decrypt(encryptedValue: string): string {
    if (!encryptedValue || !encryptedValue.includes(':')) return encryptedValue;

    try {
      const [ivHex, authTagHex, encryptedText] = encryptedValue.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        iv,
      ) as crypto.DecipherGCM;
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // If decryption fails, it might not be encrypted or key is wrong
      // In production, you might want to log this but be careful with PII
      return encryptedValue;
    }
  }

  /**
   * Creates a blind index (HMAC) for searchable encrypted fields.
   */
  hash(value: string): string {
    if (!value) return value;
    const salt = this.configService.get<string>('DB_ENCRYPTION_SALT') || '';
    return crypto.createHmac('sha256', salt).update(value).digest('hex');
  }
}
