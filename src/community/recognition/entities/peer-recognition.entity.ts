import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../../auth/entities/user.entity';

export enum RecognitionType {
  HELPFUL = 'helpful',
  KNOWLEDGEABLE = 'knowledgeable',
  SUPPORTIVE = 'supportive',
  INNOVATIVE = 'innovative',
  COLLABORATIVE = 'collaborative',
  LEADER = 'leader',
}

@Entity('peer_recognitions')
@Index(['recipientId', 'createdAt'])
@Index(['giverId', 'createdAt'])
export class PeerRecognition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'giver_id' })
  giverId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'giver_id' })
  giver: User;

  @Column({ name: 'recipient_id' })
  recipientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ type: 'enum', enum: RecognitionType })
  type: RecognitionType;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'int', default: 10 })
  pointsAwarded: number;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  relatedContent: string;

  @CreateDateColumn()
  createdAt: Date;
}
