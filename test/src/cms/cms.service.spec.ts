import { Test, TestingModule } from '@nestjs/testing';
import { CmsService } from './cms.service';

// Mock repositories
const mockContentRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockContentVersionRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('CmsService', () => {
  let service: CmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CmsService,
        { provide: 'ContentRepository', useValue: mockContentRepository },
        { provide: 'ContentVersionRepository', useValue: mockContentVersionRepository },
      ],
    }).compile();

    service = module.get<CmsService>(CmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllContents', () => {
    it('should return all contents', async () => {
      const mockData = [{ id: 1, title: 'Test Content' }];
      mockContentRepository.find.mockResolvedValue(mockData);

      const result = await service.getAllContents(); // Replace with actual method name
      expect(mockContentRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });
  });

  describe('createContent', () => {
    it('should save new content', async () => {
      const newContent = { title: 'New Content' };
      mockContentRepository.save.mockResolvedValue({ id: 1, ...newContent });

      const result = await service.createContent(newContent); // Replace with actual method
      expect(mockContentRepository.save).toHaveBeenCalledWith(newContent);
      expect(result).toEqual({ id: 1, ...newContent });
    });
  });

  describe('updateContent', () => {
    it('should update existing content', async () => {
      const contentId = 1;
      const updateData = { title: 'Updated Title' };
      mockContentRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateContent(contentId, updateData); // Replace with actual method
      expect(mockContentRepository.update).toHaveBeenCalledWith(contentId, updateData);
      expect(result).toEqual({ affected: 1 });
    });
  });

  describe('deleteContent', () => {
    it('should delete content by id', async () => {
      const contentId = 1;
      mockContentRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteContent(contentId); // Replace with actual method
      expect(mockContentRepository.delete).toHaveBeenCalledWith(contentId);
      expect(result).toEqual({ affected: 1 });
    });
  });
});
