import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { QueryCacheService } from './query-cache.service';

describe('QueryCacheService', () => {
  let service: QueryCacheService;
  const store = new Map<string, unknown>();
  const mockCache = {
    get: jest.fn((key: string) => Promise.resolve(store.get(key))),
    set: jest.fn((key: string, value: unknown) => { store.set(key, value); return Promise.resolve(); }),
    del: jest.fn((key: string) => { store.delete(key); return Promise.resolve(); }),
  };

  beforeEach(async () => {
    store.clear();
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryCacheService,
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();
    service = module.get(QueryCacheService);
  });

  it('getOrSet calls factory on miss and caches result', async () => {
    const factory = jest.fn().mockResolvedValue([{ id: '1' }]);
    const result = await service.getOrSet('key1', factory);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: '1' }]);
    expect(mockCache.set).toHaveBeenCalledWith('key1', [{ id: '1' }], 60_000);
  });

  it('getOrSet returns cached value without calling factory', async () => {
    store.set('key2', 'cached');
    const factory = jest.fn();
    const result = await service.getOrSet('key2', factory);
    expect(factory).not.toHaveBeenCalled();
    expect(result).toBe('cached');
  });

  it('del removes a key', async () => {
    store.set('key3', 'value');
    await service.del('key3');
    expect(store.has('key3')).toBe(false);
  });
});
