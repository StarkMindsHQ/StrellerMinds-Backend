import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Achievement } from './achievement.entity';

@Entity('user_achievements')
@Unique(['user', 'achievement'])
export class UserAchievement {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @ManyToOne(() => Achievement, { eager: true })
  achievement: Achievement;

  @CreateDateColumn()
  dateUnlocked: Date;
}
