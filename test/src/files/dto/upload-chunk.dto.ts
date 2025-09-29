import { IsNotEmpty, IsInt, IsString } from 'class-validator';

export class UploadChunkDto {
  @IsNotEmpty()
  @IsString()
  uploadId: string;

  @IsNotEmpty()
  @IsInt()
  chunkIndex: number;

  @IsNotEmpty()
  @IsInt()
  totalChunks: number;
}
