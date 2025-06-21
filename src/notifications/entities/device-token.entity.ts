import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import { NotificationPlatform } from '../dto/create-notification.dto';

@Entity('device_tokens')
@Unique(['userId', 'token'])
@Index(['userId', 'platform'])
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  token: string;

  @Column({
    type: 'enum',
    enum: NotificationPlatform
  })
  platform: NotificationPlatform;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  deviceId?: string;

  @Column({ nullable: true })
  appVersion?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
