import * as crypto from 'crypto';

export class EncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly SALT_SIZE = 16;
  private static readonly TAG_SIZE = 16;
  private static readonly IV_SIZE = 12;

  static encrypt(plaintext: string, masterKey: string): string {
    try {
      const key = crypto
        .pbkdf2Sync(masterKey, 'integration-salt', 100000, 32, 'sha256');
      const iv = crypto.randomBytes(this.IV_SIZE);
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();
      return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  static decrypt(ciphertext: string, masterKey: string): string {
    try {
      const [ivHex, tagHex, encrypted] = ciphertext.split(':');
      const key = crypto
        .pbkdf2Sync(masterKey, 'integration-salt', 100000, 32, 'sha256');
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');

      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  static hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }

  static generateRandomSecret(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}
