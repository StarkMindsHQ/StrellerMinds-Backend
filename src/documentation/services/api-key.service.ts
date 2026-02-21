import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey, ApiKeyStatus, ApiKeyTier } from '../entities/api-key.entity';
import { CreateApiKeyDto, UpdateApiKeyDto, ApiKeyResponseDto } from '../dto/api-key.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  /**
   * Create a new API key
   */
  async createApiKey(userId: string, dto: CreateApiKeyDto): Promise<{ apiKey: string; response: ApiKeyResponseDto }> {
    // Generate API key
    const rawKey = this.generateApiKey();
    const hashedKey = await bcrypt.hash(rawKey, 10);
    const keyPrefix = rawKey.substring(0, 8);

    const apiKey = this.apiKeyRepository.create({
      name: dto.name,
      key: hashedKey,
      keyPrefix,
      tier: dto.tier || ApiKeyTier.FREE,
      rateLimit: dto.rateLimit || 1000,
      allowedIps: dto.allowedIps,
      allowedOrigins: dto.allowedOrigins,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      userId,
      status: ApiKeyStatus.ACTIVE,
    });

    await this.apiKeyRepository.save(apiKey);

    this.logger.log(`API key created for user ${userId}: ${keyPrefix}...`);

    return {
      apiKey: rawKey, // Only returned once
      response: this.toResponseDto(apiKey),
    };
  }

  /**
   * Get all API keys for a user
   */
  async getUserApiKeys(userId: string): Promise<ApiKeyResponseDto[]> {
    const keys = await this.apiKeyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return keys.map((key) => this.toResponseDto(key));
  }

  /**
   * Get API key by ID
   */
  async getApiKey(id: string, userId: string): Promise<ApiKeyResponseDto> {
    const key = await this.apiKeyRepository.findOne({
      where: { id, userId },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    return this.toResponseDto(key);
  }

  /**
   * Update API key
   */
  async updateApiKey(id: string, userId: string, dto: UpdateApiKeyDto): Promise<ApiKeyResponseDto> {
    const key = await this.apiKeyRepository.findOne({
      where: { id, userId },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    if (dto.name) key.name = dto.name;
    if (dto.status) key.status = dto.status;
    if (dto.rateLimit) key.rateLimit = dto.rateLimit;
    if (dto.allowedIps) key.allowedIps = dto.allowedIps;
    if (dto.allowedOrigins) key.allowedOrigins = dto.allowedOrigins;

    await this.apiKeyRepository.save(key);

    return this.toResponseDto(key);
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(id: string, userId: string): Promise<void> {
    const key = await this.apiKeyRepository.findOne({
      where: { id, userId },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    key.status = ApiKeyStatus.REVOKED;
    await this.apiKeyRepository.save(key);

    this.logger.log(`API key revoked: ${key.keyPrefix}...`);
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<ApiKey | null> {
    const keys = await this.apiKeyRepository.find({
      where: { status: ApiKeyStatus.ACTIVE },
    });

    for (const key of keys) {
      const isValid = await bcrypt.compare(apiKey, key.key);
      if (isValid) {
        // Check expiration
        if (key.expiresAt && key.expiresAt < new Date()) {
          key.status = ApiKeyStatus.REVOKED;
          await this.apiKeyRepository.save(key);
          return null;
        }

        // Update last used
        key.lastUsedAt = new Date();
        key.requestCount += 1;
        key.totalRequests += 1;
        await this.apiKeyRepository.save(key);

        return key;
      }
    }

    return null;
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(apiKey: ApiKey): Promise<boolean> {
    // Reset counter if it's a new hour (simplified - in production, use Redis)
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    if (!apiKey.lastUsedAt || apiKey.lastUsedAt < lastHour) {
      apiKey.requestCount = 0;
      await this.apiKeyRepository.save(apiKey);
    }

    return apiKey.requestCount < apiKey.rateLimit;
  }

  /**
   * Generate API key
   */
  private generateApiKey(): string {
    const prefix = 'sk_';
    const randomBytes = crypto.randomBytes(32);
    const key = randomBytes.toString('base64url');
    return `${prefix}${key}`;
  }

  /**
   * Convert to response DTO
   */
  private toResponseDto(key: ApiKey): ApiKeyResponseDto {
    return {
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      status: key.status,
      tier: key.tier,
      rateLimit: key.rateLimit,
      requestCount: key.requestCount,
      totalRequests: key.totalRequests,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    };
  }
}
