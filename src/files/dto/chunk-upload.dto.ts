import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChunkUploadDto {
  @ApiProperty({ description: 'Unique identifier for the upload session' })
  @IsString()
  uploadId: string;

  @ApiProperty({ description: 'Chunk index (0-based)' })
  @IsNumber()
  chunkIndex: number;

  @ApiProperty({ description: 'Total number of chunks' })
  @IsNumber()
  totalChunks: number;

  @ApiProperty({ description: 'Original filename' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  fileSize: number;

  @ApiProperty({ description: 'File MIME type' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'File hash for integrity verification' })
  @IsString()
  fileHash: string;

  @ApiProperty({ description: 'Storage provider', enum: ['aws', 'gcs', 'azure'] })
  @IsOptional()
  @IsEnum(['aws', 'gcs', 'azure'])
  provider?: 'aws' | 'gcs' | 'azure';
}

export class InitChunkUploadDto {
  @ApiProperty({ description: 'Original filename' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  fileSize: number;

  @ApiProperty({ description: 'File MIME type' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'File hash for integrity verification' })
  @IsString()
  fileHash: string;

  @ApiProperty({ description: 'Storage provider', enum: ['aws', 'gcs', 'azure'] })
  @IsOptional()
  @IsEnum(['aws', 'gcs', 'azure'])
  provider?: 'aws' | 'gcs' | 'azure';

  @ApiProperty({ description: 'Chunk size in bytes', default: 5242880 })
  @IsOptional()
  @IsNumber()
  chunkSize?: number;
}

export class CompleteChunkUploadDto {
  @ApiProperty({ description: 'Unique identifier for the upload session' })
  @IsString()
  uploadId: string;

  @ApiProperty({ description: 'Total number of chunks' })
  @IsNumber()
  totalChunks: number;

  @ApiProperty({ description: 'File hash for final verification' })
  @IsString()
  fileHash: string;
}
