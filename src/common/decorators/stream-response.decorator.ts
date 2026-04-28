import { SetMetadata } from '@nestjs/common';

export const STREAM_RESPONSE = 'STREAM_RESPONSE';

/**
 * Decorator to mark a controller method for response streaming
 * @param options - Streaming options
 */
export const StreamResponse = (options?: { chunkSize?: number; contentType?: string }) =>
  SetMetadata(STREAM_RESPONSE, options || {});
