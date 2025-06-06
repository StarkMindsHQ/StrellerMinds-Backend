import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { CacheInterceptor } from './interceptors/cache.interceptor';
import { CacheManagerService } from './services/cache-manager.service';

describe('CacheInterceptor', () => {
  let interceptor: CacheInterceptor;
  let cacheManager: CacheManagerService;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheInterceptor,
        {
          provide: CacheManagerService,
          useValue: {
            getCachedResponse: jest.fn(),
            cacheResponse: jest.fn(),
            generateCacheKey: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<CacheInterceptor>(CacheInterceptor);
    cacheManager = module.get<CacheManagerService>(CacheManagerService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should return cached response when available', async () => {
      const context = createMockExecutionContext();
      const next: CallHandler = { handle: jest.fn(() => of('original-response')) };
      const cachedData = { data: 'cached-response' };

      jest.spyOn(reflector, 'get').mockReturnValue({ ttl: 300 });
      jest.spyOn(cacheManager, 'getCachedResponse').mockResolvedValue(cachedData);
      jest.spyOn(cacheManager, 'generateCacheKey').mockReturnValue('cache-key');

      const result = await interceptor.intercept(context, next).toPromise();

      expect(result).toBe(cachedData);
      expect(next.handle).not.toHaveBeenCalled();
    });

    it('should cache response when cache miss', async () => {
      const context = createMockExecutionContext();
      const originalResponse = { data: 'original-response' };
      const next: CallHandler = { handle: jest.fn(() => of(originalResponse)) };

      jest.spyOn(reflector, 'get').mockReturnValue({ ttl: 300 });
      jest.spyOn(cacheManager, 'getCachedResponse').mockResolvedValue(null);
      jest.spyOn(cacheManager, 'generateCacheKey').mockReturnValue('cache-key');
      jest.spyOn(cacheManager, 'cacheResponse').mockResolvedValue(undefined);

      const result = await interceptor.intercept(context, next).toPromise();

      expect(result).toBe(originalResponse);
      expect(cacheManager.cacheResponse).toHaveBeenCalledWith('cache-key', originalResponse, 300);
    });

    it('should skip caching when no cache config', async () => {
      const context = createMockExecutionContext();
      const next: CallHandler = { handle: jest.fn(() => of('response')) };

      jest.spyOn(reflector, 'get').mockReturnValue(null);

      const result = await interceptor.intercept(context, next);

      expect(result).toBe(next.handle());
    });
  });

  function createMockExecutionContext(): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/test',
          query: {},
          headers: {},
        }),
        getResponse: () => ({
          set: jest.fn(),
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  }
});
