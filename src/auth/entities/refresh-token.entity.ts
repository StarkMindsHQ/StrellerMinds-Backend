import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Indexes:
 *  - token      → B-tree on the stored hash; hit on every token validation
 *  - userId     → FK index; used to revoke all tokens for a user
 *  - expiresAt  → range scan to purge / skip expired tokens
 */
@Index('IDX_refresh_token_token', ['token'])
@Index('IDX_refresh_token_userId', ['userId'])
@Index('IDX_refresh_token_expiresAt', ['expiresAt'])
@Index('IDX_refresh_token_createdAt', ['createdAt'])
@Index('IDX_refresh_token_userId_isRevoked', ['userId', 'isRevoked'])
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** SHA-256 hash of the raw token sent to the client */
  @Column()
  token: string;

  @Column()
  userId: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  /** Soft-revocation flag; allows invalidating tokens without deleting rows */
  @Column({ default: false })
  isRevoked: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
