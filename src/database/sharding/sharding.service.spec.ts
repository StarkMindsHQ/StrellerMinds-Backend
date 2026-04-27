import { Test, TestingModule } from '@nestjs/testing';
import { ShardingService } from './sharding.service';
import { ShardConnectionService } from './shard-connection.service';
import { ShardKeyService } from './shard-key.service';
import { ShardingConfig } from './sharding.config';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';

describe('ShardingService', () => {
  let service: ShardingService;
  let shardConnectionService: jest.Mocked<ShardConnectionService>;
  let shardKeyService: jest.Mocked<ShardKeyService>;
  let shardingConfig: jest.Mocked<ShardingConfig>;
  let mockRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    } as any;

    shardConnectionService = {
      getConnection: jest.fn(),
      getAllConnections: jest.fn(),
    } as any;

    shardKeyService = {
      extractShardKey: jest.fn(),
      getShardId: jest.fn(),
    } as any;

    shardingConfig = {
      getShardCount: jest.fn().mockReturnValue(4),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShardingService,
        {
          provide: ShardConnectionService,
          useValue: shardConnectionService,
        },
        {
          provide: ShardKeyService,
          useValue: shardKeyService,
        },
        {
          provide: ShardingConfig,
          useValue: shardingConfig,
        },
      ],
    }).compile();

    service = module.get<ShardingService>(ShardingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('save', () => {
    it('should save entity to appropriate shard', async () => {
      const entity = { id: 'user-123', email: 'test@example.com' } as any;
      const shardKey = 'user-123';
      const shardId = 'shard-0';
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      } as any;

      shardKeyService.extractShardKey.mockReturnValue(shardKey);
      shardKeyService.getShardId.mockReturnValue(shardId);
      shardConnectionService.getConnection.mockReturnValue(mockDataSource);
      mockRepository.save.mockResolvedValue(entity);

      const result = await service.save(entity, 'user');

      expect(shardKeyService.extractShardKey).toHaveBeenCalledWith(entity, 'user');
      expect(shardKeyService.getShardId).toHaveBeenCalledWith(shardKey);
      expect(shardConnectionService.getConnection).toHaveBeenCalledWith(shardId);
      expect(mockRepository.save).toHaveBeenCalledWith(entity);
      expect(result).toEqual(entity);
    });

    it('should throw error if no connection found', async () => {
      const entity = { id: 'user-123' } as any;
      const shardKey = 'user-123';
      const shardId = 'shard-0';

      shardKeyService.extractShardKey.mockReturnValue(shardKey);
      shardKeyService.getShardId.mockReturnValue(shardId);
      shardConnectionService.getConnection.mockReturnValue(undefined);

      await expect(service.save(entity, 'user')).rejects.toThrow(
        'No connection found for shard: shard-0'
      );
    });
  });

  describe('findById', () => {
    it('should find entity across all shards', async () => {
      const entity = { id: 'user-123', email: 'test@example.com' } as any;
      const mockDataSource1 = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      } as any;
      const mockDataSource2 = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      } as any;

      const connections = new Map([
        ['shard-0', mockDataSource1],
        ['shard-1', mockDataSource2],
      ]);

      mockRepository.findOne
        .mockResolvedValueOnce(null) // First shard doesn't have it
        .mockResolvedValueOnce(entity); // Second shard has it

      shardConnectionService.getAllConnections.mockReturnValue(connections);

      const result = await service.findById(User, 'user-123');

      expect(result).toEqual(entity);
      expect(mockRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('should return null if entity not found in any shard', async () => {
      const mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      } as any;
      const connections = new Map([['shard-0', mockDataSource]]);

      mockRepository.findOne.mockResolvedValue(null);
      shardConnectionService.getAllConnections.mockReturnValue(connections);

      const result = await service.findById(User, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update entity on correct shard', async () => {
      const entity = { id: 'user-123', email: 'old@example.com' } as any;
      const updates = { email: 'new@example.com' };
      const updatedEntity = { ...entity, ...updates };

      mockRepository.findOne.mockResolvedValue(entity);
      mockRepository.update.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValue(updatedEntity);

      const result = await service.update(User, 'user-123', updates);

      expect(result).toEqual(updatedEntity);
      expect(mockRepository.update).toHaveBeenCalledWith('user-123', updates);
    });

    it('should return null if entity not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.update(User, 'nonexistent', {});

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete entity from correct shard', async () => {
      const entity = { id: 'user-123' } as any;

      mockRepository.findOne.mockResolvedValue(entity);
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.delete(User, 'user-123');

      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith('user-123');
    });

    it('should return false if entity not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.delete(User, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count entities across all shards', async () => {
      const mockDataSource1 = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      } as any;
      const mockDataSource2 = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      } as any;

      const connections = new Map([
        ['shard-0', mockDataSource1],
        ['shard-1', mockDataSource2],
      ]);

      mockRepository.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(15);

      shardConnectionService.getAllConnections.mockReturnValue(connections);

      const result = await service.count(User);

      expect(result).toBe(25);
    });
  });

  describe('getShardingStats', () => {
    it('should return sharding statistics', async () => {
      shardingConfig.getShardCount.mockReturnValue(4);
      shardConnectionService.getActiveConnectionCount.mockReturnValue(3);

      const result = await service.getShardingStats();

      expect(result).toEqual({
        totalShards: 4,
        activeConnections: 3,
        shardDistribution: expect.any(Map),
      });
    });
  });

  describe('migrateData', () => {
    it('should migrate data between shards', async () => {
      const entities = [
        { id: 'user-1' },
        { id: 'user-2' },
      ] as any;

      const mockFromDataSource = {
        getRepository: jest.fn().mockReturnValue({
          find: jest.fn().mockResolvedValue(entities),
          remove: jest.fn().mockResolvedValue(entities),
        }),
      } as any;

      const mockToDataSource = {
        getRepository: jest.fn().mockReturnValue({
          save: jest.fn().mockResolvedValue(entities),
        }),
      } as any;

      shardConnectionService.getConnection
        .mockReturnValueOnce(mockFromDataSource)
        .mockReturnValueOnce(mockToDataSource);

      const result = await service.migrateData(User, 'shard-0', 'shard-1', 100);

      expect(result).toEqual({ migrated: 2, errors: 0 });
    });

    it('should handle migration errors', async () => {
      const mockFromDataSource = {
        getRepository: jest.fn().mockReturnValue({
          find: jest.fn().mockRejectedValue(new Error('Connection failed')),
        }),
      } as any;

      shardConnectionService.getConnection.mockReturnValue(mockFromDataSource);

      await expect(
        service.migrateData(User, 'shard-0', 'shard-1', 100)
      ).rejects.toThrow('Connection failed');
    });
  });
});
