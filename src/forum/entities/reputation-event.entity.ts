import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class ReputationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  type: 'UPVOTE' | 'DOWNVOTE' | 'MOD_ACTION';

  @Column()
  points: number;

  @CreateDateColumn()
  createdAt: Date;
}
