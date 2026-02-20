import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity('refresh_tokens')
@Index(['token'])
@Index(['expiresAt'])
export class RefreshToken {
  @ApiProperty({ description: 'Refresh token unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'JWT refresh token' })
  @Column({ unique: true })
  token: string;

  @ApiProperty({ description: 'Token expiration date' })
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @ApiProperty({ description: 'Is token revoked' })
  @Column({ default: false })
  isRevoked: boolean;

  @ApiProperty({ description: 'Device identifier for multi-device support' })
  @Column({ nullable: true })
  deviceId?: string;

  @ApiProperty({ description: 'User agent information' })
  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @ApiProperty({ description: 'IP address of the device' })
  @Column({ nullable: true })
  ipAddress?: string;

  @ApiProperty({ description: 'Token creation timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ApiProperty({ description: 'Is token expired' })
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  @ApiProperty({ description: 'Is token valid' })
  get isValid(): boolean {
    return !this.isRevoked && !this.isExpired;
  }
}
