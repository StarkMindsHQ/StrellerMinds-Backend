import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

import { EncryptionService } from '../../../common/encryption.service';
import { encryptionTransformer } from '../../../common/encryption.transformer';

/**
 * User Persistence Entity (for User Module)
 * Database representation of a user in the user module context
 * This may differ from Auth User entity depending on context
 */
@Index('IDX_user_persistence_email_hash', ['emailHash'], { unique: true })
@Index('IDX_user_persistence_isActive', ['isActive'])
@Index('IDX_user_persistence_createdAt', ['createdAt'])
@Index('IDX_user_persistence_updatedAt', ['updatedAt'])
@Entity('users')
export class UserPersistenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Encrypted email */
  @Column({ transformer: encryptionTransformer })
  email: string;

  /** Blind index for email lookups */
  @Column({ unique: true, select: false })
  emailHash: string;

  @Column({ nullable: true, transformer: encryptionTransformer })
  firstName: string;

  @Column({ nullable: true, transformer: encryptionTransformer })
  lastName: string;

  @Column({ default: true })
  isActive: boolean;

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
