import {
  IsNotEmpty,
  IsInt,
  IsString,
  IsArray,
  IsOptional,
} from 'class-validator';

export class UploadProgressDto {
  @IsNotEmpty()
  @IsString()
  uploadId: string;

  @IsArray()
  receivedChunks: number[];

  @IsOptional()
  @IsInt()
  totalChunks?: number;
}
