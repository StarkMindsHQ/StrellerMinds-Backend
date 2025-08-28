import { Injectable, Logger, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

/**
 * Service for managing dependency injection and service resolution
 */
@Injectable()
export class DependencyInjectionService {
  private readonly logger = new Logger(DependencyInjectionService.name);
  private readonly serviceCache = new Map<string, any>();

  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * Get a service instance by type
   */
  async getService<T>(serviceType: Type<T>): Promise<T> {
    try {
      return await this.moduleRef.get(serviceType, { strict: false });
    } catch (error) {
      this.logger.error(`Failed to resolve service ${serviceType.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a service instance by token
   */
  async getServiceByToken<T>(token: string | symbol): Promise<T> {
    try {
      return await this.moduleRef.get(token, { strict: false });
    } catch (error) {
      this.logger.error(`Failed to resolve service by token ${String(token)}: ${error.message}`);
      throw error;
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
   */
  async getAllServices<T>(serviceType: Type<T>): Promise<T[]> {
    try {
      // This is a simplified approach - in a real implementation,
      // you might want to use reflection or a service registry
      return [];
    } catch (error) {
      this.logger.error(`Failed to get all services of type ${serviceType.name}: ${error.message}`);
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
   * Clear service cache
   */
  clearCache(): void {
    this.serviceCache.clear();
    this.logger.debug('Service cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.serviceCache.size,
      keys: Array.from(this.serviceCache.keys()),
    };
  }
}
