import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  notificationId: string;

  @Column()
  event: 'DELIVERED' | 'OPENED' | 'CLICKED' | 'FAILED';

  @CreateDateColumn()
  createdAt: Date;
}
