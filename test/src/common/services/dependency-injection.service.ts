import { Injectable, Logger, Type, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

/**
 * Service for managing dependency injection and service resolution
 */
export interface ServiceResolutionError extends Error {
  serviceName: string;
  token?: string | symbol;
  originalError: Error;
}

@Injectable()
export class DependencyInjectionService {
  private readonly logger = new Logger(DependencyInjectionService.name);
  private readonly serviceCache = new Map<string, any>();
  private readonly cacheEnabled = true;
  private readonly maxCacheSize = 100;

  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * Get a service instance by type
   */
  async getService<T>(serviceType: Type<T>): Promise<T> {
    const cacheKey = `type:${serviceType.name}`;
    
    // Check cache first
    if (this.cacheEnabled && this.serviceCache.has(cacheKey)) {
      this.logger.debug(`Service ${serviceType.name} found in cache`);
      return this.serviceCache.get(cacheKey);
    }

    try {
      const service = await this.moduleRef.get(serviceType, { strict: false });
      
      // Cache the service if caching is enabled
      if (this.cacheEnabled) {
        this.setCacheEntry(cacheKey, service);
      }
      
      return service;
    } catch (error) {
      const serviceError: ServiceResolutionError = {
        name: 'ServiceResolutionError',
        message: `Failed to resolve service ${serviceType.name}: ${error.message}`,
        serviceName: serviceType.name,
        originalError: error,
      };
      
      this.logger.error(`Failed to resolve service ${serviceType.name}: ${error.message}`);
      throw new ServiceUnavailableException(serviceError.message, { cause: serviceError });
    }
  }

  /**
   * Get a service instance by token
   */
  async getServiceByToken<T>(token: string | symbol): Promise<T> {
    const cacheKey = `token:${String(token)}`;
    
    // Check cache first
    if (this.cacheEnabled && this.serviceCache.has(cacheKey)) {
      this.logger.debug(`Service with token ${String(token)} found in cache`);
      return this.serviceCache.get(cacheKey);
    }

    try {
      const service = await this.moduleRef.get(token, { strict: false });
      
      // Cache the service if caching is enabled
      if (this.cacheEnabled) {
        this.setCacheEntry(cacheKey, service);
      }
      
      return service;
    } catch (error) {
      const serviceError: ServiceResolutionError = {
        name: 'ServiceResolutionError',
        message: `Failed to resolve service by token ${String(token)}: ${error.message}`,
        serviceName: String(token),
        token,
        originalError: error,
      };
      
      this.logger.error(`Failed to resolve service by token ${String(token)}: ${error.message}`);
      throw new ServiceUnavailableException(serviceError.message, { cause: serviceError });
    }
  }

  /**
   * Check if a service is available
   */
  async isServiceAvailable(serviceType: Type<any>): Promise<boolean> {
    try {
      await this.moduleRef.get(serviceType, { strict: false });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all available services of a specific type
   * Note: This is a basic implementation. For production use, consider using a service registry
   */
  async getAllServices<T>(serviceType: Type<T>): Promise<T[]> {
    try {
      // Try to get the service first to see if it exists
      const service = await this.getService(serviceType);
      return service ? [service] : [];
    } catch (error) {
      this.logger.debug(`No services of type ${serviceType.name} found: ${error.message}`);
      return [];
    }
  }

  /**
   * Resolve circular dependencies by using lazy loading
   */
  createLazyService<T>(serviceType: Type<T>): () => Promise<T> {
    return async () => {
      return await this.getService(serviceType);
    };
  }

  /**
   * Create a service factory that can be used for conditional service creation
   */
  createServiceFactory<T>(
    serviceType: Type<T>,
    condition: () => boolean
  ): () => Promise<T | null> {
    return async () => {
      if (condition()) {
        return await this.getService(serviceType);
      }
      return null;
    };
  }

  /**
   * Get service metadata for debugging purposes
   */
  getServiceMetadata(serviceType: Type<any>): any {
    try {
      const metadata = Reflect.getMetadata('design:paramtypes', serviceType) || [];
      return {
        name: serviceType.name,
        parameters: metadata.map((param: any) => param?.name || 'unknown'),
        isInjectable: Reflect.hasMetadata('injectable', serviceType),
      };
    } catch (error) {
      this.logger.warn(`Failed to get metadata for service ${serviceType.name}: ${error.message}`);
      return { name: serviceType.name, error: 'Failed to get metadata' };
    }
  }

  /**
   * Validate service dependencies
   */
  async validateServiceDependencies(serviceType: Type<any>): Promise<{
    isValid: boolean;
    missingDependencies: string[];
    errors: string[];
  }> {
    const result = {
      isValid: true,
      missingDependencies: [] as string[],
      errors: [] as string[],
    };

    try {
      const metadata = this.getServiceMetadata(serviceType);
      const dependencies = metadata.parameters || [];

      for (const dependency of dependencies) {
        if (dependency === 'unknown') {
          result.errors.push(`Unknown dependency type in ${serviceType.name}`);
          result.isValid = false;
          continue;
        }

        try {
          // Try to resolve the dependency
          const dependencyType = this.getDependencyType(dependency);
          if (dependencyType) {
            await this.getService(dependencyType);
          }
        } catch (error) {
          result.missingDependencies.push(dependency);
          result.isValid = false;
        }
      }
    } catch (error) {
      result.errors.push(`Failed to validate service ${serviceType.name}: ${error.message}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Get dependency type from string name
   * This is a simplified implementation - in practice, you might use a service registry
   */
  private getDependencyType(dependencyName: string): Type<any> | null {
    // This would typically use a service registry or reflection
    // For now, return null to indicate we can't determine the type
    return null;
  }

  /**
   * Set cache entry with size management
   */
  private setCacheEntry(key: string, value: any): void {
    if (!this.cacheEnabled) return;
    
    // Implement LRU-like behavior by removing oldest entries if cache is full
    if (this.serviceCache.size >= this.maxCacheSize) {
      const firstKey = this.serviceCache.keys().next().value;
      if (firstKey) {
        this.serviceCache.delete(firstKey);
      }
    }
    
    this.serviceCache.set(key, value);
    this.logger.debug(`Service cached: ${key}`);
  }

  /**
   * Clear service cache
   */
  clearCache(): void {
    this.serviceCache.clear();
    this.logger.debug('Service cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[]; maxSize: number; enabled: boolean } {
    return {
      size: this.serviceCache.size,
      keys: Array.from(this.serviceCache.keys()),
      maxSize: this.maxCacheSize,
      enabled: this.cacheEnabled,
    };
  }

  /**
   * Enable or disable caching
   */
  setCacheEnabled(enabled: boolean): void {
    (this as any).cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
    this.logger.debug(`Service caching ${enabled ? 'enabled' : 'disabled'}`);
  }
}
