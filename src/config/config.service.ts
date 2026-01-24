import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

@Injectable()
export class ConfigurationService {
  private secretsCache: Record<string, any> = {};

  constructor(private configService: ConfigService) {}

  get<T = any>(key: string): T {
    return this.configService.get<T>(key);
  }

  async getSecret(secretName?: string): Promise<any> {
    const name = secretName || this.get('awsSecretName');
    if (this.secretsCache[name]) return this.secretsCache[name];

    const client = new SecretsManagerClient({ region: this.get('awsRegion') });
    const command = new GetSecretValueCommand({ SecretId: name });
    const secret = await client.send(command);
    const secretValue = secret.SecretString ? JSON.parse(secret.SecretString) : {};
    this.secretsCache[name] = secretValue;
    return secretValue;
  }

  // Feature flags helper
  isFeatureEnabled(flag: string): boolean {
    const flags = this.get('featureFlags');
    return !!flags[flag];
  }
}
