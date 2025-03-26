import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Moderation Log Entity
@Entity('moderation_logs')
export class ModerationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  action: string;

  @Column()
  entityType: string;

  @Column('uuid')
  entityId: string;

  @ManyToOne(() => User)
  moderator: User;

  @CreateDateColumn()
  createdAt: Date;
}
