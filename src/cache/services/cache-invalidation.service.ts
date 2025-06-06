import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CacheManagerService } from './cache-manager.service';
import { CacheEvent } from '../enums/cache-strategy.enum';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(private cacheManager: CacheManagerService) {}

  @OnEvent('user.created')
  async handleUserCreated(payload: any): Promise<void> {
    await this.cacheManager.invalidateCache(['user:*', 'users:*']);
    this.logger.debug('Cache invalidated due to user creation');
  }

  @OnEvent('user.updated')
  async handleUserUpdated(payload: any): Promise<void> {
    const patterns = [
      `user:${payload.userId}:*`,
      'users:*',
      'user-list:*'
    ];
    await this.cacheManager.invalidateCache(patterns);
    this.logger.debug(`Cache invalidated due to user update: ${payload.userId}`);
  }

  @OnEvent('user.deleted')
  async handleUserDeleted(payload: any): Promise<void> {
    const patterns = [
      `user:${payload.userId}:*`,
      'users:*',
      'user-list:*'
    ];
    await this.cacheManager.invalidateCache(patterns);
    this.logger.debug(`Cache invalidated due to user deletion: ${payload.userId}`);
  }

  @OnEvent('product.updated')
  async handleProductUpdated(payload: any): Promise<void> {
    const patterns = [
      `product:${payload.productId}:*`,
      'products:*',
      'product-list:*',
      'categories:*'
    ];
    await this.cacheManager.invalidateCache(patterns);
    this.logger.debug(`Cache invalidated due to product update: ${payload.productId}`);
  }

  @OnEvent('inventory.updated')
  async handleInventoryUpdated(payload: any): Promise<void> {
    const patterns = [
      `product:${payload.productId}:*`,
      'products:*',
      'inventory:*'
    ];
    await this.cacheManager.invalidateCache(patterns);
    this.logger.debug(`Cache invalidated due to inventory update: ${payload.productId}`);
  }

  @OnEvent('content.updated')
  async handleContentUpdated(payload: any): Promise<void> {
    await this.cacheManager.invalidateCache(['public:*', 'content:*']);
    this.logger.debug('Public content cache invalidated');
  }

  @OnEvent('cache.cleanup')
  async handleCacheCleanup(): Promise<void> {
    this.logger.debug('Cache cleanup initiated');
  }
}