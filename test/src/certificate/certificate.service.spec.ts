import { Test, TestingModule } from '@nestjs/testing';
import { CertificatesService } from './certificate.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Certificate } from './entity/certificate.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

describe('CertificatesService', () => {
  let service: CertificatesService;
  let repo: Repository<Certificate>;

  const mockCertificate = {
    id: '1',
    certificateNumber: 'CERT123',
    issueDate: new Date(),
    pdfUrl: 'http://example.com/cert.pdf',
    user: Promise.resolve({ id: 'user1' }),
    course: Promise.resolve({ id: 'course1' }),
  } as Certificate;

  const mockRepo = {
    create: jest.fn().mockReturnValue(mockCertificate),
    save: jest.fn().mockResolvedValue(mockCertificate),
    find: jest.fn().mockResolvedValue([mockCertificate]),
    findOne: jest.fn().mockResolvedValue(mockCertificate),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificatesService,
        {
          provide: getRepositoryToken(Certificate),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<CertificatesService>(CertificatesService);
    repo = module.get<Repository<Certificate>>(getRepositoryToken(Certificate));
  });

  it('should create a certificate', async () => {
    const dto = { certificateNumber: 'CERT123', issueDate: new Date(), userId: 'user1', courseId: 'course1' };
    const result = await service.create(dto as any);
    expect(result).toEqual(mockCertificate);
    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(repo.save).toHaveBeenCalledWith(mockCertificate);
  });

  it('should return all certificates', async () => {
    const result = await service.findAll();
    expect(result).toEqual([mockCertificate]);
  });

  it('should return one certificate by ID', async () => {
    const result = await service.findOne('1');
    expect(result).toEqual(mockCertificate);
  });

  it('should throw NotFoundException if certificate not found', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue(null);
    await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
  });

  it('should update a certificate', async () => {
    const updated = await service.update('1', { pdfUrl: 'new-url.pdf' });
    expect(repo.update).toHaveBeenCalledWith('1', { pdfUrl: 'new-url.pdf' });
    expect(updated).toEqual(mockCertificate);
  });

  it('should delete a certificate', async () => {
    const result = await service.remove('1');
    expect(result).toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith('1');
  });

  it('should throw NotFoundException on delete if not found', async () => {
    jest.spyOn(repo, 'delete').mockResolvedValue({ affected: 0 });
    await expect(service.remove('999')).rejects.toThrow(NotFoundException);
  });
});
