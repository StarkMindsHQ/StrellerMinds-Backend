import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface SecretConfig {
  key: string;
  required: boolean;
  environments: string[];
}

@Injectable()
export class SecretsManager {
  private readonly logger = new Logger(SecretsManager.name);
  private secrets: Map<string, string> = new Map();
  private readonly secretDefinitions: SecretConfig[] = [
    { key: 'DATABASE_PASSWORD', required: true, environments: ['production', 'staging'] },
    { key: 'REDIS_PASSWORD', required: true, environments: ['production', 'staging'] },
    { key: 'JWT_SECRET', required: true, environments: ['production', 'staging', 'development'] },
    { key: 'SIGNER_SECRET_KEY', required: true, environments: ['production', 'staging'] },
    { key: 'CLOUDINARY_API_SECRET', required: true, environments: ['production', 'staging'] },
    { key: 'AWS_SECRET_ACCESS_KEY', required: false, environments: ['production', 'staging'] },
    { key: 'AWS_CLOUDFRONT_PRIVATE_KEY', required: false, environments: ['production', 'staging'] },
  ];

  constructor() {
    this.loadSecrets();
  }

  private loadSecrets(): void {
    const environment = process.env.NODE_ENV || 'development';

    // Try loading from secrets file first (recommended for production)
    const secretsFilePath = this.getSecretsFilePath();
    if (existsSync(secretsFilePath)) {
      this.loadFromFile(secretsFilePath);
      this.logger.log('Secrets loaded from file');
    } else {
      // Fallback to environment variables
      this.loadFromEnvironment();
      this.logger.warn('Secrets loaded from environment variables. Consider using a secrets file in production.');
    }

    // Validate required secrets
    this.validateSecrets(environment);
  }

  private getSecretsFilePath(): string {
    const environment = process.env.NODE_ENV || 'development';

    // Priority order for secrets file locations
    const possiblePaths = [
      process.env.SECRETS_FILE_PATH, // Custom path from env
      resolve(process.cwd(), 'secrets', `${environment}.secrets`),
      resolve('/etc/app/secrets', `${environment}.secrets`), // Production path
    ];

    for (const path of possiblePaths) {
      if (path && existsSync(path)) {
        return path;
      }
    }

    return '';
  }

  private loadFromFile(filePath: string): void {
    try {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          continue;
        }

        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          this.secrets.set(key.trim(), value);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to load secrets from file: ${error.message}`);
      throw error;
    }
  }

  private loadFromEnvironment(): void {
    for (const secretDef of this.secretDefinitions) {
      const value = process.env[secretDef.key];
      if (value) {
        this.secrets.set(secretDef.key, value);
      }
    }
  }

  private validateSecrets(environment: string): void {
    const missingSecrets: string[] = [];

    for (const secretDef of this.secretDefinitions) {
      if (
        secretDef.required &&
        secretDef.environments.includes(environment) &&
        !this.secrets.has(secretDef.key)
      ) {
        missingSecrets.push(secretDef.key);
      }
    }

    if (missingSecrets.length > 0) {
      const errorMsg = `Missing required secrets for ${environment}: ${missingSecrets.join(', ')}`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public getSecret(key: string, defaultValue?: string): string | undefined {
    return this.secrets.get(key) || defaultValue;
  }

  public hasSecret(key: string): boolean {
    return this.secrets.has(key);
  }

  public getAllSecretKeys(): string[] {
    return Array.from(this.secrets.keys());
  }

  public getMaskedSecrets(): Record<string, string> {
    const masked: Record<string, string> = {};
    for (const [key, value] of this.secrets.entries()) {
      masked[key] = this.maskSecret(value);
    }
    return masked;
  }

  private maskSecret(value: string): string {
    if (!value || value.length < 4) {
      return '***';
    }
    return `${value.substring(0, 2)}${'*'.repeat(value.length - 4)}${value.substring(value.length - 2)}`;
  }
}