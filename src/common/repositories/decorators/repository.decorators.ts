import 'reflect-metadata';

export const REPOSITORY_METADATA_KEY = Symbol('repository');

export interface RepositoryOptions {
  entity?: any;
  connection?: string;
  transactional?: boolean;
  cacheable?: boolean;
  cacheDuration?: number;
}

export function Repository(options?: RepositoryOptions): ClassDecorator {
  return function (target: any) {
    Reflect.defineMetadata(REPOSITORY_METADATA_KEY, options || {}, target);
  };
}

export function InjectRepository(): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol | undefined) {
    if (typeof propertyKey === 'string') {
      const type = Reflect.getMetadata('design:type', target, propertyKey);
      if (type) {
        Reflect.defineMetadata(`${REPOSITORY_METADATA_KEY}:inject`, type, target, propertyKey);
      }
    }
  };
}

export function Transactional(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol | undefined, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const unitOfWork = this.unitOfWork || this.getUnitOfWork?.();
      
      if (unitOfWork && unitOfWork.isTransactionActive()) {
        return originalMethod.apply(this, args);
      }

      if (unitOfWork) {
        return unitOfWork.withTransaction((manager) => {
          return originalMethod.apply(this, args);
        });
      }

      throw new Error('No UnitOfWork available for transactional operation');
    };

    return descriptor;
  };
}

export function Cacheable(duration: number = 300): MethodDecorator {
  return function (target: any, propertyKey: string | symbol | undefined, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${String(propertyKey)}:${JSON.stringify(args)}`;
      
      // Try to get from cache first
      if (this.cacheService) {
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Cache the result
      if (this.cacheService && result) {
        await this.cacheService.set(cacheKey, result, duration);
      }

      return result;
    };

    return descriptor;
  };
}

export function CacheInvalidate(pattern?: string): MethodDecorator {
  return function (target: any, propertyKey: string | symbol | undefined, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      // Invalidate cache after successful operation
      if (this.cacheService) {
        const invalidatePattern = pattern || `${target.constructor.name}:*`;
        await this.cacheService.invalidatePattern(invalidatePattern);
      }

      return result;
    };

    return descriptor;
  };
}
