import { IsEnum } from 'class-validator';
import { ContentStatus } from '../enums/content-status.enum';

export class UpdateStatusDto {
  @IsEnum(ContentStatus)
  status: ContentStatus;
}
