import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxDocument } from '../entities/tax-document.entity';
import { TaxDocumentStatus } from '../enums/tax-document-status.enum';
import { UploadTaxDocumentDto } from '../dto/upload-tax-document.dto';
import { ListTaxDocumentsDto } from '../dto/list-tax-documents.dto';
import { IpfsService } from '../ipfs/ipfs.service';

export interface TaxDocumentRetrieval {
  document: TaxDocument;
  content: Buffer;
}

export interface TaxDocumentVerification {
  documentId: string;
  status: TaxDocumentStatus;
  matches: boolean;
  expectedSha256: string;
  actualSha256: string;
  verifiedAt: Date;
  error: string | null;
}

@Injectable()
export class TaxDocumentsService {
  constructor(
    @InjectRepository(TaxDocument)
    private readonly repository: Repository<TaxDocument>,
    private readonly ipfs: IpfsService,
  ) {}

  async upload(dto: UploadTaxDocumentDto): Promise<TaxDocument> {
    const content = Buffer.from(dto.contentBase64, 'base64');
    const { cid, sha256, size } = await this.ipfs.upload(content);

    const document = this.repository.create({
      type: dto.type,
      status: TaxDocumentStatus.Pending,
      ipfsHash: cid,
      contentSha256: sha256,
      filename: dto.filename,
      sizeBytes: dto.sizeBytes ?? size,
      mimeType: dto.mimeType ?? null,
      ownerUserId: dto.ownerUserId,
      propertyId: dto.propertyId ?? null,
    });

    return this.repository.save(document);
  }

  async findOne(id: string): Promise<TaxDocument> {
    const document = await this.repository.findOne({ where: { id } });
    if (!document) {
      throw new NotFoundException(`Tax document "${id}" not found`);
    }
    return document;
  }

  async findAll(filter: ListTaxDocumentsDto = {}): Promise<TaxDocument[]> {
    return this.repository.find({
      where: {
        ...(filter.ownerUserId ? { ownerUserId: filter.ownerUserId } : {}),
        ...(filter.propertyId ? { propertyId: filter.propertyId } : {}),
        ...(filter.type ? { type: filter.type } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async retrieve(id: string): Promise<TaxDocumentRetrieval> {
    const document = await this.findOne(id);
    const content = await this.ipfs.fetch(document.ipfsHash);
    return { document, content };
  }

  async verify(id: string): Promise<TaxDocumentVerification> {
    const document = await this.findOne(id);
    const verifiedAt = new Date();

    try {
      const result = await this.ipfs.verify(document.ipfsHash, document.contentSha256);
      const status = result.matches ? TaxDocumentStatus.Verified : TaxDocumentStatus.Failed;
      const error = result.matches
        ? null
        : `Hash mismatch: expected ${result.expectedSha256}, got ${result.actualSha256}`;

      await this.repository.update(document.id, {
        status,
        verifiedAt,
        verificationError: error,
      });

      return {
        documentId: document.id,
        status,
        matches: result.matches,
        expectedSha256: result.expectedSha256,
        actualSha256: result.actualSha256,
        verifiedAt,
        error,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown verification error';
      await this.repository.update(document.id, {
        status: TaxDocumentStatus.Failed,
        verifiedAt,
        verificationError: error,
      });

      return {
        documentId: document.id,
        status: TaxDocumentStatus.Failed,
        matches: false,
        expectedSha256: document.contentSha256,
        actualSha256: '',
        verifiedAt,
        error,
      };
    }
  }
}
