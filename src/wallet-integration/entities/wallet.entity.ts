import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Credential } from './credential.entity';

/**
 * Enum for supported wallet types.
 */
export enum WalletType {
  METAMASK = 'metamask',
  WALLETCONNECT = 'walletconnect',
  COINBASE = 'coinbase',
  PHANTOM = 'phantom',
  TRUST = 'trust',
}

/**
 * Entity representing a blockchain wallet.
 */
@Entity('wallets')
export class Wallet {
  /** Unique wallet ID */
  @ApiProperty({ description: 'Unique wallet ID', example: 'uuid-wallet' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Wallet address (public key) */
  @ApiProperty({ description: 'Wallet address (public key)', example: '0x1234abcd...' })
  @Column({ unique: true })
  address: string;

  /** Type of wallet provider */
  @ApiProperty({
    description: 'Type of wallet provider',
    enum: WalletType,
    example: WalletType.METAMASK,
  })
  @Column({
    type: 'enum',
    enum: WalletType,
  })
  type: WalletType;

  /** ENS name (optional) */
  @ApiProperty({ description: 'ENS name (optional)', required: false, example: 'alice.eth' })
  @Column({ nullable: true })
  ensName?: string;

  /** Whether the wallet is active */
  @ApiProperty({ description: 'Whether the wallet is active', example: true })
  @Column({ default: true })
  isActive: boolean;

  /** Last connection date/time (optional) */
  @ApiProperty({
    description: 'Last connection date/time',
    required: false,
    type: String,
    format: 'date-time',
    example: '2025-06-29T12:00:00Z',
  })
  @Column({ nullable: true })
  lastConnectedAt?: Date;

  /** Credentials associated with this wallet */
  @ApiProperty({ description: 'Credentials associated with this wallet', type: () => [Credential] })
  @OneToMany(() => Credential, (credential) => credential.wallet)
  credentials: Credential[];

  /** Date/time when the wallet was created */
  @ApiProperty({
    description: 'Date/time when the wallet was created',
    type: String,
    format: 'date-time',
    example: '2025-06-29T12:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  /** Date/time when the wallet was last updated */
  @ApiProperty({
    description: 'Date/time when the wallet was last updated',
    type: String,
    format: 'date-time',
    example: '2025-06-29T12:00:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
