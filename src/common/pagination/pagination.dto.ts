import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Limit per page (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'eyJpZCI6IjE2MjY2...',
    description: 'Cursor token for cursor-based pagination',
  })
  @ValidateIf((o) => o.cursor != null)
  @IsString()
  @IsOptional()
  cursor?: string;
}

export class CursorPaginationMetaDto {
  @ApiPropertyOptional({ example: 'eyJj...' })
  nextCursor?: string;

  @ApiPropertyOptional({ example: 'eyJj...' })
  previousCursor?: string;

  @ApiPropertyOptional({ example: 20 })
  limit: number;
}

export class OffsetPaginationMetaDto {
  @ApiPropertyOptional({ example: 0 })
  total: number;

  @ApiPropertyOptional({ example: 1 })
  page: number;

  @ApiPropertyOptional({ example: 20 })
  limit: number;

  @ApiPropertyOptional({ example: 5 })
  totalPages: number;
}
