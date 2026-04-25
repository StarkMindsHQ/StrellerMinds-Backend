import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * RefreshToken Persistence Entity
 * Database representation of refresh tokens
 * Stored separately from the domain entity for infrastructure concerns
 */
@Index('IDX_refresh_token_persistence_token', ['token'], { unique: true })
@Index('IDX_refresh_token_persistence_userId', ['userId'])
@Index('IDX_refresh_token_persistence_expiresAt', ['expiresAt'])
@Entity('refresh_tokens')
export class RefreshTokenPersistenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  token: string;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
