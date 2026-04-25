import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { RefreshToken } from './refresh-token.entity';
import { EncryptionService } from '../../common/encryption.service';
import { encryptionTransformer } from '../../common/encryption.transformer';

/**
 * Indexes:
 *  - emailHash    → unique B-tree (login lookups, duplicate-check on register)
 *  - isActive     → partial-index candidate; used in user-status filters
 *  - createdAt    → range scans for admin dashboards / reporting
 */
@Index('IDX_user_email_hash', ['emailHash'], { unique: true })
@Index('IDX_user_isActive', ['isActive'])
@Index('IDX_user_createdAt', ['createdAt'])
@Index('IDX_user_updatedAt', ['updatedAt'])
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Encrypted email for display/communication */
  @Column({ transformer: encryptionTransformer })
  email: string;

  /** Blind index for email lookups */
  @Column({ unique: true, select: false })
  emailHash: string;

  @Column({ transformer: encryptionTransformer })
  password: string;

  @Column({ nullable: true, transformer: encryptionTransformer })
  firstName: string;

  @Column({ nullable: true, transformer: encryptionTransformer })
  lastName: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true, select: false, transformer: encryptionTransformer })
  passwordResetToken: string;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  passwordResetExpires: Date;

  @OneToMany(() => RefreshToken, (token) => token.user, { cascade: ['remove'] })
  refreshTokens: RefreshToken[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  updateEmailHash() {
    if (this.email) {
      const service = EncryptionService.getInstance();
      if (service) {
        this.emailHash = service.hash(this.email.toLowerCase());
      }
    }
  }
}
