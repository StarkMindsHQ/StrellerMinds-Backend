import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DeletionToken entity for account deletion confirmation tokens.
 */
@Entity()
export class DeletionToken {
  @ApiProperty({ description: 'Token ID', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Token string', example: 'secure-token' })
  @Column()
  token: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ description: 'User ID', example: 'uuid-v4' })
  @Column()
  user_id: string;

  @ApiProperty({ description: 'Date created', example: '2024-01-01T00:00:00Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Date expires', example: '2024-01-02T00:00:00Z' })
  @Column()
  expiresAt: Date;
}
