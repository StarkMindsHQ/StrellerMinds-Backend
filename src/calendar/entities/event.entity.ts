import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Booking } from './booking.entity';

@Entity('calendar_event')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'timestamptz' })
  start: Date;

  @Column({ type: 'timestamptz', nullable: true })
  end?: Date;

  @Column({ length: 64, default: 'UTC' })
  timezone: string;

  @Column({ default: false })
  allDay: boolean;

  @Column({ length: 50, default: 'generic' })
  eventType: string; // 'course' | 'office' | 'assignment' | 'personal'

  @Column({ type: 'text', nullable: true })
  recurrenceRule?: string; // RFC5545 RRULE

  @Column({ type: 'json', nullable: true })
  metadata?: any;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ownerId?: string;

  @Column({ type: 'json', nullable: true })
  sharedWith?: { userId: string; permission: 'read' | 'write' }[];

  @OneToMany(() => Booking, (b) => b.event)
  bookings?: Booking[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
