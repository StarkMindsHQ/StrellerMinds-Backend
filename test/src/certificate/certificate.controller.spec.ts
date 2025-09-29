import { Test, TestingModule } from '@nestjs/testing';
import { CertificatesController } from './certificate.controller';
import { CertificatesService } from './certificate.service';
import { Certificate } from './entity/certificate.entity';

describe('CertificatesController', () => {
  let controller: CertificatesController;
  let service: CertificatesService;

  const mockCertificate = {
    id: '1',
    certificateNumber: 'CERT123',
    issueDate: new Date(),
    pdfUrl: 'http://example.com/cert.pdf',
    user: Promise.resolve({ id: 'user1' }),
    course: Promise.resolve({ id: 'course1' }),
  } as Certificate;

  const mockService = {
    create: jest.fn().mockResolvedValue(mockCertificate),
    findAll: jest.fn().mockResolvedValue([mockCertificate]),
    findOne: jest.fn().mockResolvedValue(mockCertificate),
    update: jest.fn().mockResolvedValue(mockCertificate),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertificatesController],
      providers: [
        {
          provide: CertificatesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CertificatesController>(CertificatesController);
    service = module.get<CertificatesService>(CertificatesService);
  });

  it('should create a certificate', async () => {
    const dto = { certificateNumber: 'CERT123', issueDate: new Date(), userId: 'user1', courseId: 'course1' };
    const result = await controller.create(dto as any);
    expect(result).toEqual(mockCertificate);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should return all certificates', async () => {
    const result = await controller.findAll();
    expect(result).toEqual([mockCertificate]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('should return a certificate by ID', async () => {
    const result = await controller.findOne('1');
    expect(result).toEqual(mockCertificate);
    expect(service.findOne).toHaveBeenCalledWith('1');
  });

  it('should update a certificate', async () => {
    const updateDto = { pdfUrl: 'updated.pdf' };
    const result = await controller.update('1', updateDto);
    expect(result).toEqual(mockCertificate);
    expect(service.update).toHaveBeenCalledWith('1', updateDto);
  });

  it('should delete a certificate', async () => {
    const result = await controller.remove('1');
    expect(result).toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('1');
  });
});
