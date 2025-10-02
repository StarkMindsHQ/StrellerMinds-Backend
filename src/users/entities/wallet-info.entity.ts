/**
 * WalletInfo entity representing a user's wallet information.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('wallet_info')
export class WalletInfo {
  @ApiProperty({ description: 'Wallet info ID', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Wallet balance', example: 100.5 })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  balance: number;

  @ApiProperty({ description: 'Currency', example: 'USD' })
  @Column()
  currency: string;

  @ApiProperty({ description: 'Wallet address', example: '0x123...' })
  @Column({ unique: true })
  @Index()
  walletAddress: string;

  @ApiPropertyOptional({ description: 'Wallet type', example: 'Metamask' })
  @Column({ nullable: true })
  walletType: string;

  @ApiPropertyOptional({ description: 'Blockchain chain ID', example: '1' })
  @Column({ nullable: true })
  chainId: string;

  @ApiPropertyOptional({ description: 'Blockchain credentials', type: 'object' })
  @Column({ type: 'jsonb', nullable: true })
  blockchainCredentials: Record<string, any>;

  @ApiProperty({ description: 'Date created', example: '2024-01-01T00:00:00Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Date updated', example: '2024-01-01T00:00:00Z' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: 'Is orphaned', example: false })
  @Column({ default: false })
  orphaned: boolean;

  @ApiPropertyOptional({ description: 'Date orphaned', example: '2024-01-01T00:00:00Z' })
  @Column({ nullable: true })
  orphanedAt: Date;

  @OneToOne(() => User, (user) => user.walletInfo)
  @JoinColumn()
  user: User;
}
