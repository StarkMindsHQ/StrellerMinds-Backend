import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './services/cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'cache.strategy': 'memory',
                'cache.ttl': 300,
                'cache.max': 1000,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get and set', () => {
    it('should store and retrieve data', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };

      await service.set(key, value, 60);
      const result = await service.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const result = await service.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should handle TTL expiration', async () => {
      const key = 'expiring-key';
      const value = { data: 'expiring-data' };

      await service.set(key, value, 1); 
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result = await service.get(key);
      expect(result).toBeNull();
    });
  });

  describe('delete and clear', () => {
    it('should delete specific key', async () => {
      const key = 'delete-key';
      const value = { data: 'delete-data' };

      await service.set(key, value);
      await service.del(key);
      
      const result = await service.get(key);
      expect(result).toBeNull();
    });

    it('should clear cache with pattern', async () => {
      await service.set('user:1', { id: 1 });
      await service.set('user:2', { id: 2 });
      await service.set('product:1', { id: 1 });

      await service.clear('user:*');

      expect(await service.get('user:1')).toBeNull();
      expect(await service.get('user:2')).toBeNull();
      expect(await service.get('product:1')).not.toBeNull();
    });
  });

  describe('exists and ttl', () => {
    it('should check if key exists', async () => {
      const key = 'exists-key';
      
      expect(await service.exists(key)).toBeFalsy();
      
      await service.set(key, { data: 'test' });
      expect(await service.exists(key)).toBeTruthy();
    });

    it('should return TTL for key', async () => {
      const key = 'ttl-key';
      const ttl = 300;
      
      await service.set(key, { data: 'test' }, ttl);
      const remainingTtl = await service.ttl(key);
      
      expect(remainingTtl).toBeGreaterThan(0);
      expect(remainingTtl).toBeLessThanOrEqual(ttl);
    });
  });
});
