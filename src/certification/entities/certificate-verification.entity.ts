import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Certificate } from './certificate.entity';

@Entity('certificate_verifications')
@Index(['certificateId'])
@Index(['verifierInfo'])
@Index(['createdAt'])
export class CertificateVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  certificateId: string;

  @ManyToOne(() => Certificate, (certificate) => certificate.verifications)
  @JoinColumn({ name: 'certificateId' })
  certificate: Certificate;

  @Column({ type: 'json' })
  verifierInfo: {
    ipAddress: string;
    userAgent: string;
    organization?: string;
    purpose?: string;
    verifierEmail?: string;
  };

  @Column({ default: true })
  isValid: boolean;

  @Column({ type: 'json', nullable: true })
  verificationDetails: {
    method: 'qr_code' | 'certificate_number' | 'api' | 'blockchain';
    timestamp: Date;
    additionalData?: Record<string, any>;
  };

  @CreateDateColumn()
  createdAt: Date;
}
