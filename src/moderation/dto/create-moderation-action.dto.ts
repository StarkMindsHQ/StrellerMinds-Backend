import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export enum EntityType {
  POST = 'post',
  TOPIC = 'topic',
}

export class ModerationActionDto {
  @IsEnum(EntityType)
  @IsNotEmpty()
  entityType: EntityType; // The type of entity being moderated (post/topic)

  @IsUUID()
  @IsNotEmpty()
  entityId: string; // The ID of the entity being moderated (either a post or a topic)

  @IsString()
  @IsNotEmpty()
  action: string; // The action being taken (e.g., 'approve', 'ban', 'report')
}
