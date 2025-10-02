import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchIndexingService } from './search-indexing.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { Course } from '../../courses/entities/course.entity';
import { SearchMLService } from './search-ml.service';

describe('SearchIndexingService.reindexAll', () => {
  let service: SearchIndexingService;
  let es: { bulk: jest.Mock; indices: any };
  let courseRepo: jest.Mocked<Repository<Course>>;
  let ml: { generateCourseEmbedding: jest.Mock };

  beforeEach(async () => {
    es = {
      bulk: jest.fn().mockResolvedValue({ body: { errors: false, items: [] } }),
      indices: {
        create: jest.fn().mockResolvedValue({}),
        updateAliases: jest.fn().mockResolvedValue({}),
        get: jest.fn().mockResolvedValue({ body: {} }),
        delete: jest.fn().mockResolvedValue({}),
        stats: jest
          .fn()
          .mockResolvedValue({
            body: {
              _all: { total: { docs: { count: 0 }, store: { size_in_bytes: 0 } } },
              _shards: {},
            },
          }),
        forcemerge: jest.fn().mockResolvedValue({}),
      },
    } as any;

    courseRepo = {
      count: jest.fn().mockResolvedValue(2),
      find: jest
        .fn()
        .mockResolvedValue([
          {
            id: 'c1',
            title: 'T1',
            description: 'D1',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
          {
            id: 'c2',
            title: 'T2',
            description: 'D2',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
        ]),
    } as any;

    ml = { generateCourseEmbedding: jest.fn().mockResolvedValue([0.1, 0.2]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchIndexingService,
        { provide: ElasticsearchService, useValue: es },
        { provide: ConfigService, useValue: { get: jest.fn(() => 100) } },
        { provide: SearchMLService, useValue: ml },
        { provide: getRepositoryToken(Course), useValue: courseRepo },
      ],
    }).compile();

    service = module.get(SearchIndexingService);
  });

  it('creates index, indexes courses in batches, switches alias and cleans old', async () => {
    await service.reindexAll();
    expect(es.indices.create).toHaveBeenCalled();
    expect(courseRepo.count).toHaveBeenCalled();
    expect(es.bulk).toHaveBeenCalled();
    expect(es.indices.updateAliases).toHaveBeenCalled();
  });
});
