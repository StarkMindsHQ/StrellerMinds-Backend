import { Test, TestingModule } from '@nestjs/testing';
import { IpfsService } from './ipfs.service';

describe('IpfsService', () => {
  let service: IpfsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IpfsService],
    }).compile();

    service = module.get<IpfsService>(IpfsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should add and retrieve content', async () => {
    const content = Buffer.from('test content');
    const cid = await service.addFile(content);
    const retrievedContent = await service.getFile(cid);
    expect(retrievedContent).toEqual(content.toString());
  });

  it('should verify content correctly', async () => {
    const content = Buffer.from('test content');
    const cid = await service.addFile(content);
    const isValid = service.verifyContent(cid, content);
    expect(isValid).toBe(true);
  });
});
