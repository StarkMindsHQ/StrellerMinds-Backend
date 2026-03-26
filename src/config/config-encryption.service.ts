import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface EncryptedConfig {
  algorithm: string;
  keyId: string;
  iv: string;
  data: string;
  version: string;
  timestamp: number;
}

@Injectable()
export class ConfigEncryptionService {
  private readonly logger = new Logger(ConfigEncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly encryptionKeysPath = path.join(process.cwd(), '.config-keys');
  private readonly configVersion = '1.0.0';

  constructor() {
    this.ensureKeyDirectory();
  }

  private ensureKeyDirectory(): void {
    if (!fs.existsSync(this.encryptionKeysPath)) {
      fs.mkdirSync(this.encryptionKeysPath, { mode: 0o700 });
      this.logger.log(`Created encryption keys directory: ${this.encryptionKeysPath}`);
    }
  }

  private getOrCreateEncryptionKey(keyId: string): Buffer {
    const keyPath = path.join(this.encryptionKeysPath, `${keyId}.key`);
    
    if (fs.existsSync(keyPath)) {
      const keyData = fs.readFileSync(keyPath);
      this.logger.debug(`Loaded existing encryption key for keyId: ${keyId}`);
      return keyData;
    }

    const key = crypto.randomBytes(this.keyLength);
    fs.writeFileSync(keyPath, key, { mode: 0o600 });
    this.logger.log(`Generated new encryption key for keyId: ${keyId}`);
    return key;
  }

  encrypt(value: string, keyId: string = 'default'): EncryptedConfig {
    try {
      const key = this.getOrCreateEncryptionKey(keyId);
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from(this.configVersion));
      
      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      const encryptedConfig: EncryptedConfig = {
        algorithm: this.algorithm,
        keyId,
        iv: iv.toString('hex'),
        data: encrypted,
        version: this.configVersion,
        timestamp: Date.now(),
        tag: tag.toString('hex'),
      };

      this.logger.debug(`Successfully encrypted configuration value for keyId: ${keyId}`);
      return encryptedConfig;
    } catch (error) {
      this.logger.error(`Failed to encrypt configuration value: ${error.message}`);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  decrypt(encryptedConfig: EncryptedConfig, keyId?: string): string {
    try {
      const actualKeyId = keyId || encryptedConfig.keyId;
      const key = this.getOrCreateEncryptionKey(actualKeyId);
      const iv = Buffer.from(encryptedConfig.iv, 'hex');
      const tag = Buffer.from(encryptedConfig.tag, 'hex');
      
      const decipher = crypto.createDecipher(encryptedConfig.algorithm, key);
      decipher.setAAD(Buffer.from(encryptedConfig.version));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encryptedConfig.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      this.logger.debug(`Successfully decrypted configuration value for keyId: ${actualKeyId}`);
      return decrypted;
    } catch (error) {
      this.logger.error(`Failed to decrypt configuration value: ${error.message}`);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  encryptObject(obj: Record<string, any>, keyId: string = 'default'): EncryptedConfig {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString, keyId);
  }

  decryptObject<T = any>(encryptedConfig: EncryptedConfig, keyId?: string): T {
    const decryptedString = this.decrypt(encryptedConfig, keyId);
    return JSON.parse(decryptedString);
  }

  rotateKey(oldKeyId: string, newKeyId: string): void {
    this.logger.log(`Starting key rotation from ${oldKeyId} to ${newKeyId}`);
    
    const oldKey = this.getOrCreateEncryptionKey(oldKeyId);
    const newKey = crypto.randomBytes(this.keyLength);
    const newKeyPath = path.join(this.encryptionKeysPath, `${newKeyId}.key`);
    
    fs.writeFileSync(newKeyPath, newKey, { mode: 0o600 });
    
    this.logger.log(`Successfully rotated encryption key from ${oldKeyId} to ${newKeyId}`);
  }

  listKeys(): string[] {
    try {
      const files = fs.readdirSync(this.encryptionKeysPath);
      return files
        .filter(file => file.endsWith('.key'))
        .map(file => file.replace('.key', ''));
    } catch (error) {
      this.logger.error(`Failed to list encryption keys: ${error.message}`);
      return [];
    }
  }

  deleteKey(keyId: string): boolean {
    try {
      const keyPath = path.join(this.encryptionKeysPath, `${keyId}.key`);
      if (fs.existsSync(keyPath)) {
        fs.unlinkSync(keyPath);
        this.logger.log(`Deleted encryption key for keyId: ${keyId}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to delete encryption key for keyId: ${keyId}: ${error.message}`);
      return false;
    }
  }

  validateKeyIntegrity(keyId: string): boolean {
    try {
      const key = this.getOrCreateEncryptionKey(keyId);
      return key.length === this.keyLength;
    } catch (error) {
      this.logger.error(`Key integrity validation failed for keyId: ${keyId}: ${error.message}`);
      return false;
    }
  }

  getKeyMetadata(keyId: string): { keyId: string; createdAt: Date; lastAccessed: Date; size: number } | null {
    try {
      const keyPath = path.join(this.encryptionKeysPath, `${keyId}.key`);
      if (!fs.existsSync(keyPath)) {
        return null;
      }

      const stats = fs.statSync(keyPath);
      return {
        keyId,
        createdAt: stats.birthtime,
        lastAccessed: stats.atime,
        size: stats.size,
      };
    } catch (error) {
      this.logger.error(`Failed to get key metadata for keyId: ${keyId}: ${error.message}`);
      return null;
    }
  }

  exportEncryptedConfig(config: Record<string, any>, outputPath: string, keyId: string = 'default'): void {
    try {
      const encryptedConfig = this.encryptObject(config, keyId);
      fs.writeFileSync(outputPath, JSON.stringify(encryptedConfig, null, 2));
      this.logger.log(`Exported encrypted configuration to: ${outputPath}`);
    } catch (error) {
      this.logger.error(`Failed to export encrypted configuration: ${error.message}`);
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  importEncryptedConfig(inputPath: string, keyId?: string): Record<string, any> {
    try {
      const encryptedData = fs.readFileSync(inputPath, 'utf8');
      const encryptedConfig: EncryptedConfig = JSON.parse(encryptedData);
      return this.decryptObject(encryptedConfig, keyId);
    } catch (error) {
      this.logger.error(`Failed to import encrypted configuration: ${error.message}`);
      throw new Error(`Import failed: ${error.message}`);
    }
  }
}
