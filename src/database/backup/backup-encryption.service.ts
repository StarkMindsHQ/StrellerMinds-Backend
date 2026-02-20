import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import { EncryptionResult, EncryptionMetadata } from './interfaces';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;
const VERSION = 1;

@Injectable()
export class BackupEncryptionService {
  private readonly logger = new Logger(BackupEncryptionService.name);
  private readonly masterKey: Buffer | null;
  private readonly encryptionEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.encryptionEnabled = this.configService.get<boolean>('BACKUP_ENCRYPTION_ENABLED', true);

    const keyBase64 = this.configService.get<string>('BACKUP_ENCRYPTION_KEY');
    if (keyBase64) {
      this.masterKey = Buffer.from(keyBase64, 'base64');
      if (this.masterKey.length !== KEY_LENGTH) {
        this.logger.warn(
          `Encryption key should be ${KEY_LENGTH} bytes. Deriving key from provided value.`,
        );
        this.masterKey = crypto.createHash('sha256').update(keyBase64).digest();
      }
    } else {
      this.masterKey = null;
      if (this.encryptionEnabled) {
        this.logger.warn(
          'BACKUP_ENCRYPTION_KEY not set. Encryption will use a derived key from default secret.',
        );
      }
    }
  }

  isEncryptionEnabled(): boolean {
    return this.encryptionEnabled;
  }

  async encryptFile(inputPath: string, outputPath?: string): Promise<EncryptionResult> {
    const startTime = Date.now();
    const keyId = this.generateKeyId();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = this.deriveKey(salt);

    const finalOutputPath = outputPath || inputPath.replace(/(\.[^.]+)?$/, '.enc$1');

    this.logger.debug(`Encrypting file: ${inputPath} -> ${finalOutputPath}`);

    try {
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

      // Create header with metadata
      const header = this.createHeader(VERSION, salt, iv);

      const inputStream = fsSync.createReadStream(inputPath);
      const outputStream = fsSync.createWriteStream(finalOutputPath);

      // Write header first
      outputStream.write(header);

      // Encrypt the file content
      await pipeline(inputStream, cipher, outputStream);

      // Get auth tag and append to file
      const authTag = cipher.getAuthTag();
      await fs.appendFile(finalOutputPath, authTag);

      const duration = Date.now() - startTime;
      this.logger.log(`File encrypted successfully in ${duration}ms: ${finalOutputPath}`);

      return {
        encryptedPath: finalOutputPath,
        keyId,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      };
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`);
      // Clean up partial output file
      try {
        await fs.unlink(finalOutputPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  async decryptFile(
    inputPath: string,
    outputPath?: string,
    metadata?: Partial<EncryptionMetadata>,
  ): Promise<string> {
    const startTime = Date.now();

    const finalOutputPath = outputPath || inputPath.replace(/\.enc(\.[^.]+)?$/, '$1');

    this.logger.debug(`Decrypting file: ${inputPath} -> ${finalOutputPath}`);

    try {
      const fileHandle = await fs.open(inputPath, 'r');
      const stats = await fileHandle.stat();

      // Read header (4 bytes version + 32 bytes salt + 16 bytes IV = 52 bytes)
      const headerSize = 4 + SALT_LENGTH + IV_LENGTH;
      const headerBuffer = Buffer.alloc(headerSize);
      await fileHandle.read(headerBuffer, 0, headerSize, 0);

      const { version, salt, iv } = this.parseHeader(headerBuffer);

      if (version !== VERSION) {
        throw new Error(`Unsupported encryption version: ${version}`);
      }

      // Read auth tag from end of file
      const authTagBuffer = Buffer.alloc(AUTH_TAG_LENGTH);
      await fileHandle.read(authTagBuffer, 0, AUTH_TAG_LENGTH, stats.size - AUTH_TAG_LENGTH);

      await fileHandle.close();

      // Derive key from salt
      const key = this.deriveKey(salt);

      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTagBuffer);

      // Calculate encrypted data boundaries
      const encryptedDataStart = headerSize;
      const encryptedDataEnd = stats.size - AUTH_TAG_LENGTH;

      const inputStream = fsSync.createReadStream(inputPath, {
        start: encryptedDataStart,
        end: encryptedDataEnd - 1,
      });
      const outputStream = fsSync.createWriteStream(finalOutputPath);

      await pipeline(inputStream, decipher, outputStream);

      const duration = Date.now() - startTime;
      this.logger.log(`File decrypted successfully in ${duration}ms: ${finalOutputPath}`);

      return finalOutputPath;
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`);
      // Clean up partial output file
      try {
        await fs.unlink(finalOutputPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  createEncryptStream(): {
    stream: Transform;
    keyId: string;
    iv: Buffer;
    salt: Buffer;
    getAuthTag: () => Buffer;
  } {
    const keyId = this.generateKeyId();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = this.deriveKey(salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    return {
      stream: cipher,
      keyId,
      iv,
      salt,
      getAuthTag: () => cipher.getAuthTag(),
    };
  }

  createDecryptStream(salt: Buffer, iv: Buffer, authTag: Buffer): Transform {
    const key = this.deriveKey(salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return decipher;
  }

  async calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fsSync.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async verifyChecksum(filePath: string, expectedChecksum: string): Promise<boolean> {
    const actualChecksum = await this.calculateChecksum(filePath);
    return actualChecksum === expectedChecksum;
  }

  private deriveKey(salt: Buffer): Buffer {
    const baseKey = this.masterKey || this.getDefaultKey();
    return crypto.pbkdf2Sync(baseKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  }

  private getDefaultKey(): Buffer {
    // Derive a key from JWT secret as fallback
    const secret = this.configService.get<string>('JWT_SECRET', 'default-backup-key-change-me');
    return crypto.createHash('sha256').update(secret).digest();
  }

  private generateKeyId(): string {
    return `key-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private createHeader(version: number, salt: Buffer, iv: Buffer): Buffer {
    const header = Buffer.alloc(4 + SALT_LENGTH + IV_LENGTH);
    header.writeUInt32BE(version, 0);
    salt.copy(header, 4);
    iv.copy(header, 4 + SALT_LENGTH);
    return header;
  }

  private parseHeader(header: Buffer): {
    version: number;
    salt: Buffer;
    iv: Buffer;
  } {
    const version = header.readUInt32BE(0);
    const salt = header.subarray(4, 4 + SALT_LENGTH);
    const iv = header.subarray(4 + SALT_LENGTH, 4 + SALT_LENGTH + IV_LENGTH);
    return { version, salt, iv };
  }

  getEncryptionMetadata(
    keyId: string,
    salt: Buffer,
    iv: Buffer,
    authTag: Buffer,
  ): EncryptionMetadata {
    return {
      version: VERSION,
      algorithm: ALGORITHM,
      keyId,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }
}
