import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
@Entity()
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  channel: 'EMAIL' | 'IN_APP' | 'PUSH';

  @Column()
  templateKey: string;

  @Column('jsonb')
  payload: Record<string, any>;

  @Column({ default: 'PENDING' })
  status: 'PENDING' | 'SENT' | 'FAILED';

  @Column({ nullable: true })
  scheduledAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
