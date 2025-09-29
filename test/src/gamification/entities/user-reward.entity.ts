import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Reward } from './reward.entity';

@Entity('user_rewards')
@Unique(['user', 'reward'])
export class UserReward {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @ManyToOne(() => Reward, { eager: true })
  reward: Reward;

  @CreateDateColumn()
  dateGranted: Date;
} 