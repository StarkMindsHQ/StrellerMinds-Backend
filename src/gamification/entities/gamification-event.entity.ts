import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('gamification_events')
export class GamificationEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column()
  eventType: string;

  @Column('json', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  timestamp: Date;
}
