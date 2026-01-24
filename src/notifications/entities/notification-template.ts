import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
@Entity()
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column()
  channel: 'EMAIL' | 'PUSH' | 'IN_APP';

  @Column()
  language: string; // en, fr, de

  @Column('text')
  subject?: string;

  @Column('text')
  body: string;
}
