import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Wallet } from './wallet.entity';

export enum CredentialType {
  EDUCATION = 'education',
  EMPLOYMENT = 'employment',
  CERTIFICATION = 'certification',
  IDENTITY = 'identity',
  ACHIEVEMENT = 'achievement'
}

export enum CredentialStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  PENDING = 'pending'
}

@Entity('credentials')
export class Credential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  credentialId: string;

  @Column({
    type: 'enum',
    enum: CredentialType,
  })
  type: CredentialType;

  @Column({
    type: 'enum',
    enum: CredentialStatus,
    default: CredentialStatus.PENDING
  })
  status: CredentialStatus;

  @Column()
  issuer: string;

  @Column()
  subject: string;

  @Column('json')
  credentialData: any;

  @Column({ nullable: true })
  proofValue?: string;

  @Column({ nullable: true })
  expirationDate?: Date;

  @Column({ default: false })
  isShared: boolean;

  @Column({ nullable: true })
  sharedWith?: string;

  @Column({ nullable: true })
  transactionHash?: string;

  @ManyToOne(() => Wallet, wallet => wallet.credentials)
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  @Column()
  walletId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
