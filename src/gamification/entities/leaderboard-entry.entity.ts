import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('leaderboard_entries')
@Index(['period', 'score'])
export class LeaderboardEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column('int')
  score: number;

  @Column('int')
  rank: number;

  @Column()
  period: string;
}
