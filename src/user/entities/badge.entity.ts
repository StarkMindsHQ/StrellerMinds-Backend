import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserBadge } from './user-badge.entity';

@Entity('badges')
export class Badge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  iconUrl: string;

  @Column({ type: 'varchar', length: 50 })
  category: 'achievement' | 'learning' | 'participation' | 'skill' | 'milestone';

  @Column({ type: 'int', default: 1 })
  rarity: number; // 1-5, 5 being rarest

  @Column({ type: 'text', nullable: true })
  unlockedCriteria: string; // Description of how to unlock

  @Column({ type: 'int', default: 0 })
  totalAwarded: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => UserBadge, (userBadge) => userBadge.badge, {
    cascade: true,
  })
  userBadges: UserBadge[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
