import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxDocument } from '../entities/tax-document.entity';
import { TaxDocumentType } from '../enums/tax-document-type.enum';
import { TaxDocumentStatus } from '../enums/tax-document-status.enum';
import { IpfsService } from '../ipfs/ipfs.service';
import { LocalIpfsClient } from '../ipfs/local-ipfs-client';
import { TaxDocumentsService } from './tax-documents.service';

class InMemoryDocumentRepository {
  private readonly docs = new Map<string, TaxDocument>();
  private seq = 0;

  create(partial: Partial<TaxDocument>): TaxDocument {
    return {
      id: '',
      verifiedAt: null,
      verificationError: null,
      mimeType: null,
      propertyId: null,
      ...partial,
    } as TaxDocument;
  }

  async save(doc: TaxDocument): Promise<TaxDocument> {
    if (!doc.id) {
      doc.id = `doc-${++this.seq}`;
      doc.createdAt = new Date();
    }
    doc.updatedAt = new Date();
    this.docs.set(doc.id, doc);
    return doc;
  }

  async findOne({ where }: { where: { id: string } }): Promise<TaxDocument | null> {
    return this.docs.get(where.id) ?? null;
  }

  async find({
    where,
    order: _order,
  }: {
    where: Partial<TaxDocument>;
    order?: unknown;
  }): Promise<TaxDocument[]> {
    return Array.from(this.docs.values()).filter((d) =>
      Object.entries(where).every(([k, v]) => (d as Record<string, unknown>)[k] === v),
    );
  }

  async update(id: string, patch: Partial<TaxDocument>): Promise<void> {
    const existing = this.docs.get(id);
    if (existing) {
      Object.assign(existing, patch, { updatedAt: new Date() });
    }
  }
}

describe('TaxDocumentsService', () => {
  let service: TaxDocumentsService;
  let repository: InMemoryDocumentRepository;
  let ipfs: IpfsService;
  let client: LocalIpfsClient;

  beforeEach(async () => {
    repository = new InMemoryDocumentRepository();
    client = new LocalIpfsClient();
    ipfs = new IpfsService(client);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxDocumentsService,
        { provide: getRepositoryToken(TaxDocument), useValue: repository },
        { provide: IpfsService, useValue: ipfs },
      ],
    }).compile();

    service = module.get(TaxDocumentsService);
  });

  const baseDto = (overrides: Partial<Parameters<TaxDocumentsService['upload']>[0]> = {}) => ({
    type: TaxDocumentType.TaxReturn,
    filename: 'return-2024.pdf',
    contentBase64: Buffer.from('Form 1040').toString('base64'),
    ownerUserId: '11111111-1111-1111-1111-111111111111',
    ...overrides,
  });

  describe('upload', () => {
    it('persists metadata, computes sha256, and stores content on IPFS', async () => {
      const dto = baseDto();
      const expectedBuffer = Buffer.from('Form 1040');

      const document = await service.upload(dto);

      expect(document.id).toMatch(/^doc-/);
      expect(document.type).toBe(TaxDocumentType.TaxReturn);
      expect(document.status).toBe(TaxDocumentStatus.Pending);
      expect(document.ipfsHash).toMatch(/^local-[a-f0-9]{64}$/);
      expect(document.contentSha256).toHaveLength(64);
      expect(document.sizeBytes).toBe(expectedBuffer.length);

      const stored = await client.cat(document.ipfsHash);
      expect(stored.equals(expectedBuffer)).toBe(true);
    });

    it('honors explicitly provided sizeBytes and mimeType', async () => {
      const document = await service.upload(
        baseDto({ sizeBytes: 999, mimeType: 'application/pdf' }),
      );
      expect(document.sizeBytes).toBe(999);
      expect(document.mimeType).toBe('application/pdf');
    });
  });

  describe('findOne / findAll', () => {
    it('throws NotFoundException for unknown id', async () => {
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('filters by ownerUserId and type', async () => {
      const a = await service.upload(baseDto());
      await service.upload(
        baseDto({
          type: TaxDocumentType.PaymentReceipt,
          ownerUserId: '22222222-2222-2222-2222-222222222222',
          contentBase64: Buffer.from('receipt').toString('base64'),
        }),
      );

      const ownedByA = await service.findAll({ ownerUserId: a.ownerUserId });
      expect(ownedByA).toHaveLength(1);
      expect(ownedByA[0].id).toBe(a.id);

      const receipts = await service.findAll({ type: TaxDocumentType.PaymentReceipt });
      expect(receipts).toHaveLength(1);
      expect(receipts[0].type).toBe(TaxDocumentType.PaymentReceipt);
    });
  });

  describe('retrieve', () => {
    it('returns the document and its IPFS content', async () => {
      const document = await service.upload(baseDto());
      const { document: out, content } = await service.retrieve(document.id);
      expect(out.id).toBe(document.id);
      expect(content.toString('utf8')).toBe('Form 1040');
    });
  });

  describe('verify', () => {
    it('marks a document Verified when content matches the stored sha256', async () => {
      const document = await service.upload(baseDto());

      const result = await service.verify(document.id);

      expect(result.matches).toBe(true);
      expect(result.status).toBe(TaxDocumentStatus.Verified);
      expect(result.error).toBeNull();

      const after = await service.findOne(document.id);
      expect(after.status).toBe(TaxDocumentStatus.Verified);
      expect(after.verifiedAt).toBeInstanceOf(Date);
      expect(after.verificationError).toBeNull();
    });

    it('marks Failed and records the mismatch when IPFS content has been tampered with', async () => {
      const document = await service.upload(baseDto());

      jest
        .spyOn(client, 'cat')
        .mockResolvedValueOnce(Buffer.from('TAMPERED'));

      const result = await service.verify(document.id);

      expect(result.matches).toBe(false);
      expect(result.status).toBe(TaxDocumentStatus.Failed);
      expect(result.error).toMatch(/Hash mismatch/);

      const after = await service.findOne(document.id);
      expect(after.status).toBe(TaxDocumentStatus.Failed);
      expect(after.verificationError).toMatch(/Hash mismatch/);
    });

    it('marks Failed with the underlying error when IPFS retrieval throws', async () => {
      const document = await service.upload(baseDto());

      jest.spyOn(client, 'cat').mockRejectedValueOnce(new Error('gateway down'));

      const result = await service.verify(document.id);

      expect(result.status).toBe(TaxDocumentStatus.Failed);
      expect(result.matches).toBe(false);
      expect(result.error).toBe('gateway down');

      const after = await service.findOne(document.id);
      expect(after.verificationError).toBe('gateway down');
    });
  });
});
