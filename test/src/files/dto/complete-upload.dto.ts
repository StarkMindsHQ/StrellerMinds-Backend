import { IsNotEmpty, IsInt, IsString } from 'class-validator';

export class CompleteUploadDto {
  @IsNotEmpty()
  @IsString()
  uploadId: string;

  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsInt()
  totalChunks: number;
}
