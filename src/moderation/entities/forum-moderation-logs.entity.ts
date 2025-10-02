import { User } from 'src/users/entities/user.entity';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Entity representing a moderation log entry.
 */
@Entity('moderation_logs')
export class ModerationLog {
  /** Unique log ID */
  @ApiProperty({ description: 'Unique log ID', example: 'uuid-log' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Moderation action performed */
  @ApiProperty({ description: 'Moderation action performed', example: 'ban' })
  @Column()
  action: string;

  /** Type of entity moderated */
  @ApiProperty({ description: 'Type of entity moderated', example: 'post' })
  @Column()
  entityType: string;

  /** ID of the entity moderated */
  @ApiProperty({ description: 'ID of the entity moderated', example: 'uuid-entity' })
  @Column('uuid')
  entityId: string;

  /** Moderator who performed the action */
  @ApiProperty({ description: 'Moderator', type: () => User })
  @ManyToOne(() => User)
  moderator: User;

  /** Date the moderation action was logged */
  @ApiProperty({ description: 'Date the moderation action was logged' })
  @CreateDateColumn()
  createdAt: Date;
}
