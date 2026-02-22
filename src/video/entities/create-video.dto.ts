import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VideoVisibility } from '../entities/video.entity';

export class CreateVideoDto {
  @ApiProperty({ description: 'Title of the video' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Description of the video', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: VideoVisibility, default: VideoVisibility.PRIVATE })
  @IsEnum(VideoVisibility)
  @IsOptional()
  visibility?: VideoVisibility;
}