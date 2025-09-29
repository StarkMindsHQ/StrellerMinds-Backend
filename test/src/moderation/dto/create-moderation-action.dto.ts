import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum EntityType {
  POST = 'post',
  TOPIC = 'topic',
}

/**
 * DTO for logging a moderation action.
 */
export class ModerationActionDto {
  /** The type of entity being moderated (post/topic) */
  @ApiProperty({ enum: EntityType, description: 'The type of entity being moderated (post/topic)' })
  @IsEnum(EntityType)
  @IsNotEmpty()
  entityType: EntityType; // The type of entity being moderated (post/topic)

  /** The ID of the entity being moderated (either a post or a topic) */
  @ApiProperty({ description: 'The ID of the entity being moderated (either a post or a topic)' })
  @IsUUID()
  @IsNotEmpty()
  entityId: string; // The ID of the entity being moderated (either a post or a topic)

  /** The action being taken (e.g., approve, ban, report) */
  @ApiProperty({ description: 'The action being taken (e.g., approve, ban, report)' })
  @IsString()
  @IsNotEmpty()
  action: string; // The action being taken (e.g., 'approve', 'ban', 'report')
}
