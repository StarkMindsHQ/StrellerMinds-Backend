import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConfig } from '../../common/entities/integration-config.entity';
import { SSOService } from './sso.service';

@Injectable()
export class SSOConfigService {
  private readonly logger = new Logger(SSOConfigService.name);

  constructor(
    @InjectRepository(IntegrationConfig)
    private configRepository: Repository<IntegrationConfig>,
    private ssoService: SSOService,
  ) {}

  /**
   * Create SSO configuration
   */
  async createSSOConfig(
    userId: string,
    provider: string,
    name: string,
    credentials: any,
  ): Promise<IntegrationConfig> {
    const config = this.configRepository.create({
      userId,
      integrationType: 'sso' as any,
      status: 'pending' as any,
      credentials: {
        provider,
        ...credentials,
      },
      metadata: {
        provider,
      },
      displayName: name,
    });

    return this.configRepository.save(config);
  }

  /**
   * Get SSO config
   */
  async getSSOConfig(configId: string, userId: string): Promise<IntegrationConfig> {
    return this.configRepository.findOne({
      where: { id: configId, userId },
    });
  }

  /**
   * List all SSO configs for user
   */
  async listSSOConfigs(userId: string): Promise<IntegrationConfig[]> {
    return this.configRepository.find({
      where: {
        userId,
        integrationType: 'sso' as any,
      },
    });
  }

  /**
   * Update SSO config
   */
  async updateSSOConfig(
    configId: string,
    userId: string,
    updates: Partial<IntegrationConfig>,
  ): Promise<IntegrationConfig> {
    await this.configRepository.update(
      { id: configId, userId },
      updates,
    );
    return this.getSSOConfig(configId, userId);
  }

  /**
   * Activate SSO config
   */
  async activateSSOConfig(configId: string, userId: string): Promise<IntegrationConfig> {
    return this.updateSSOConfig(configId, userId, {
      status: 'active' as any,
      isActive: true,
    });
  }

  /**
   * Deactivate SSO config
   */
  async deactivateSSOConfig(configId: string, userId: string): Promise<IntegrationConfig> {
    return this.updateSSOConfig(configId, userId, {
      status: 'inactive' as any,
      isActive: false,
    });
  }
}
