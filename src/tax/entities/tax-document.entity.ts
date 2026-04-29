import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaxDocumentType } from '../enums/tax-document-type.enum';
import { TaxDocumentStatus } from '../enums/tax-document-status.enum';

@Index('IDX_tax_document_owner', ['ownerUserId'])
@Index('IDX_tax_document_property', ['propertyId'])
@Index('IDX_tax_document_type', ['type'])
@Index('IDX_tax_document_status', ['status'])
@Index('IDX_tax_document_ipfsHash', ['ipfsHash'], { unique: true })
@Entity('tax_documents')
export class TaxDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TaxDocumentType })
  type: TaxDocumentType;

  @Column({ type: 'enum', enum: TaxDocumentStatus, default: TaxDocumentStatus.Pending })
  status: TaxDocumentStatus;

  @Column({ length: 256 })
  ipfsHash: string;

  @Column({ length: 64 })
  contentSha256: string;

  @Column({ length: 255 })
  filename: string;

  @Column({ type: 'bigint' })
  sizeBytes: number;

  @Column({ length: 255, nullable: true })
  mimeType: string | null;

  @Column('uuid')
  ownerUserId: string;

  @Column({ length: 128, nullable: true })
  propertyId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  verificationError: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
