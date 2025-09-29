import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { User } from './user.entity';
  import { ApiProperty } from '@nestjs/swagger';
  
  /**
 * UserSettings entity representing user preferences and settings.
 */
  @Entity('user_settings')
  export class UserSettings {
    @ApiProperty({ description: 'Settings ID', example: 'uuid-v4' })
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @ApiProperty({ description: 'Dark mode enabled', example: true })
    @Column({ default: true })
    darkModeEnabled: boolean;
  
    @ApiProperty({ description: 'Newsletter subscribed', example: false })
    @Column({ default: false })
    newsletterSubscribed: boolean;
  
    @ApiProperty({ description: 'Preferred language', example: 'en' })
    @Column({ default: 'en' })
    preferredLanguage: string;
  
    @ApiProperty({ description: 'Date created', example: '2024-01-01T00:00:00Z' })
    @CreateDateColumn()
    createdAt: Date;
  
    @ApiProperty({ description: 'Date updated', example: '2024-01-01T00:00:00Z' })
    @UpdateDateColumn()
    updatedAt: Date;
  
    @OneToOne(() => User, (user) => user.settings, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
  }
