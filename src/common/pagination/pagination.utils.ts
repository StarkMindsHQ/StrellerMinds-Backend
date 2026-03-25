import { BadRequestException } from '@nestjs/common';

export interface CursorPayload {
  id: string;
  createdAt: string;
}

export interface CursorPaginationMeta {
  cursor?: string;
  nextCursor?: string | null;
  previousCursor?: string | null;
  limit: number;
}

export interface OffsetPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function buildCursorForCreatedAt(createdAt: Date, id: string): string {
  const payload: CursorPayload = {
    id,
    createdAt: createdAt.toISOString(),
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

export function decodeCursor(cursor: string): CursorPayload | null {
  if (!cursor) {
    return null;
  }

  let decoded: string;
  try {
    decoded = Buffer.from(cursor, 'base64').toString('utf8');
  } catch (error) {
    throw new BadRequestException('Cursor must be a valid base64 string');
  }

  try {
    const payload = JSON.parse(decoded);
    if (!payload?.id || !payload?.createdAt) {
      throw new Error('Cursor payload is missing required fields');
    }

    return {
      id: payload.id,
      createdAt: payload.createdAt,
    };
  } catch (error) {
    throw new BadRequestException('Invalid cursor payload');
  }
}

export function validatePaginationParams(page: number, limit: number, cursor?: string) {
  if (cursor && page !== undefined && page !== null) {
    throw new BadRequestException(
      'Use either cursor-based pagination or page/limit pagination, not both',
    );
  }

  if (page !== undefined && (page < 1 || Number.isNaN(page))) {
    throw new BadRequestException('page must be a positive integer');
  }

  if (limit < 1 || limit > 100) {
    throw new BadRequestException('limit must be between 1 and 100');
  }
}
