import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import type { Repository } from 'typeorm';
import type { Queue } from 'bull';
import { jest } from '@jest/globals';

import { OfflineSyncService } from '../services/offline-sync.service';
import { OfflineSync } from '../entities/offline-sync.entity';

describe('OfflineSyncService', () => {
  let service: OfflineSyncService;
  let syncRepository: Repository<OfflineSync>;
  let syncQueue: Queue;

  const mockSyncRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
    addBulk: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfflineSyncService,
        {
          provide: getRepositoryToken(OfflineSync),
          useValue: mockSyncRepository,
        },
        {
          provide: getQueueToken('background-sync'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<OfflineSyncService>(OfflineSyncService);
    syncRepository = module.get<Repository<OfflineSync>>(getRepositoryToken(OfflineSync));
    syncQueue = module.get<Queue>(getQueueToken('background-sync'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSyncJob', () => {
    it('should create and queue a sync job', async () => {
      const syncJobDto = {
        userId: 'user123',
        operation: 'create' as const,
        entityType: 'analytics-event',
        data: { eventName: 'test' },
      };

      const createdJob = {
        id: 'job123',
        ...syncJobDto,
        status: 'pending',
        priority: 5,
      };

      mockSyncRepository.create.mockReturnValue(createdJob);
      mockSyncRepository.save.mockResolvedValue(createdJob);
      mockQueue.add.mockResolvedValue({});

      const result = await service.createSyncJob(syncJobDto);

      expect(mockSyncRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          operation: 'create',
          entityType: 'analytics-event',
          status: 'pending',
        }),
      );
      expect(mockSyncRepository.save).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-sync',
        { syncJobId: 'job123' },
        expect.objectContaining({
          priority: 5,
          attempts: 3,
        }),
      );
      expect(result).toEqual(createdJob);
    });
  });

  describe('batchCreateSyncJobs', () => {
    it('should create multiple sync jobs', async () => {
      const jobs = [
        {
          operation: 'create' as const,
          entityType: 'analytics-event',
          data: { eventName: 'test1' },
        },
        {
          operation: 'update' as const,
          entityType: 'user-profile',
          data: { name: 'John' },
        },
      ];

      const createdJobs = [
        { id: 'job1', ...jobs[0] },
        { id: 'job2', ...jobs[1] },
      ];

      mockSyncRepository.create.mockImplementation((data) => data);
      mockSyncRepository.save.mockResolvedValue(createdJobs);
      mockQueue.addBulk.mockResolvedValue([]);

      const result = await service.batchCreateSyncJobs(jobs);

      expect(mockSyncRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ operation: 'create' }),
          expect.objectContaining({ operation: 'update' }),
        ]),
      );
      expect(mockQueue.addBulk).toHaveBeenCalled();
      expect(result).toEqual(createdJobs);
    });
  });

  describe('updateSyncJobStatus', () => {
    it('should update job status to completed', async () => {
      const result = { success: true, data: { processed: true } };

      await service.updateSyncJobStatus('job123', 'completed', result);

      expect(mockSyncRepository.update).toHaveBeenCalledWith(
        'job123',
        expect.objectContaining({
          status: 'completed',
          processedAt: expect.any(Date),
          result: result.data,
        }),
      );
    });

    it('should handle failed status with retry logic', async () => {
      const syncJob = {
        id: 'job123',
        retryCount: 1,
        maxRetries: 3,
      };

      mockSyncRepository.findOne.mockResolvedValue(syncJob);

      await service.updateSyncJobStatus('job123', 'failed', undefined, 'Test error');

      expect(mockSyncRepository.update).toHaveBeenCalledWith(
        'job123',
        expect.objectContaining({
          status: 'pending', // Should retry
          retryCount: 2,
          nextRetryAt: expect.any(Date),
          errorMessage: 'Test error',
        }),
      );
    });
  });
});
