import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('follows')
export class Follow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserProfile, (profile) => profile.following, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'follower_id' })
  follower: UserProfile;

  @Column({ type: 'uuid', name: 'follower_id' })
  followerId: string;

  @ManyToOne(() => UserProfile, (profile) => profile.followers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'following_id' })
  following: UserProfile;

  @Column({ type: 'uuid', name: 'following_id' })
  followingId: string;

  @Column({ type: 'varchar', length: 50, default: 'follow' })
  status: 'follow' | 'block' | 'mute'; // Follow status

  @Column({ type: 'boolean', default: false })
  isNotified: boolean; // Notifications enabled for this user

  @CreateDateColumn()
  createdAt: Date;
}
