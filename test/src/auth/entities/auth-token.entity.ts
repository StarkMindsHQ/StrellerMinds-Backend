import { User } from '../../users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('auth_tokens')
export class AuthToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 500 })
  token: string;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @Column({ nullable: true })
  deviceInfo: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ default: 'login' })
  purpose: 'login' | 'reset_password';

  @CreateDateColumn()
  createdAt: Date;

  // Many-to-One relationship with the User entity
  @Index()
  @ManyToOne(() => User, (user) => user.authTokens, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user: User;
}
