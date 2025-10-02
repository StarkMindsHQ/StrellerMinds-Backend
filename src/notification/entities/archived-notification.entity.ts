import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('archived_notifications')
export class ArchivedNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @Column()
  type: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  archivedAt: Date;
}
