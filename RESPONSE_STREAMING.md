# Response Streaming Implementation

## Overview

This document describes the implementation of response streaming in the StrellerMinds Backend to handle large responses efficiently without loading them entirely into memory.

## Issue #808: Add Response Streaming

**Priority**: Low  
**Description**: Stream large responses instead of loading into memory.

## Implementation Details

### 1. Streaming Response Interceptor

Created a global interceptor that handles streaming configuration for endpoints marked with the `@StreamResponse` decorator.

**File**: `src/common/interceptors/streaming-response.interceptor.ts`

Features:
- Automatically sets streaming headers (`Transfer-Encoding: chunked`)
- Configurable content types
- Security headers (`X-Content-Type-Options: nosniff`)
- Uses metadata from `@StreamResponse` decorator

### 2. Stream Response Decorator

Created a decorator to mark endpoints for streaming support.

**File**: `src/common/decorators/stream-response.decorator.ts`

Usage:
```typescript
@StreamResponse({ contentType: 'application/json' })
async myEndpoint() {
  // Endpoint implementation
}
```

### 3. Stream Utilities

Created utility functions for different streaming scenarios.

**File**: `src/common/utils/stream.util.ts`

Available utilities:
- `StreamUtil.arrayToStream<T>()` - Convert arrays to readable streams
- `StreamUtil.stringToStream()` - Convert strings to readable streams  
- `StreamUtil.jsonArrayToStream<T>()` - Convert arrays to JSON stream

### 4. Enhanced Endpoints

#### GDPR Data Export (`/gdpr/export/:userId`)
- **Before**: Loaded entire export into memory
- **After**: Streams data in 8KB chunks
- **Benefits**: Reduced memory usage for large user data exports

#### Courses List (`/courses`)
- **Before**: Returned complete response in memory
- **After**: Optional streaming via `?stream=true` query parameter
- **Chunk Size**: 50 courses per chunk
- **Headers**: `X-Next-Cursor`, `X-Has-More` for pagination

#### Users List (`/users`)
- **Before**: Returned complete response in memory  
- **After**: Optional streaming via `?stream=true` query parameter
- **Chunk Size**: 50 users per chunk
- **Headers**: `X-Next-Cursor`, `X-Has-More` for pagination

## Usage Examples

### GDPR Data Export
```bash
curl -X GET "http://localhost:3000/gdpr/export/user123" \
  -H "Authorization: Bearer <token>" \
  --output user-data.json
```

### Streaming Courses List
```bash
curl -X GET "http://localhost:3000/courses?stream=true&limit=1000" \
  -H "Authorization: Bearer <token>"
```

### Streaming Users List
```bash
curl -X GET "http://localhost:3000/users?stream=true&limit=1000" \
  -H "Authorization: Bearer <token>"
```

## Performance Benefits

1. **Memory Efficiency**: Large responses no longer loaded entirely into memory
2. **Scalability**: Better handling of concurrent requests with large data
3. **Responsiveness**: Clients receive data incrementally
4. **Resource Usage**: Reduced server memory pressure

## Configuration

### Chunk Sizes
- GDPR Export: 8KB chunks
- List Endpoints: 50 items per chunk

### Headers
- `Transfer-Encoding: chunked` - Enables HTTP chunked encoding
- `X-Content-Type-Options: nosniff` - Security header
- `X-Next-Cursor` - Pagination cursor for list endpoints
- `X-Has-More` - Indicates if more data available

## Backward Compatibility

All endpoints maintain backward compatibility:
- Existing clients continue to work without changes
- Streaming is opt-in via query parameters
- Default behavior remains unchanged

## Testing

### Unit Tests
Test streaming functionality with different data sizes:
```typescript
describe('StreamingResponseInterceptor', () => {
  it('should set streaming headers for decorated endpoints', async () => {
    // Test implementation
  });
});
```

### Integration Tests
Test endpoints with streaming enabled:
```bash
# Test large dataset streaming
curl -X GET "http://localhost:3000/courses?stream=true&limit=10000"
```

## Monitoring

Monitor memory usage and response times:
```typescript
// Memory usage before streaming
process.memoryUsage().heapUsed

// Memory usage during streaming
process.memoryUsage().heapUsed
```

## Future Enhancements

1. **Compression**: Add gzip compression for streamed responses
2. **Rate Limiting**: Implement streaming-aware rate limiting
3. **Metrics**: Add streaming-specific metrics
4. **WebSocket Streaming**: Consider WebSocket for real-time data streams

## Security Considerations

1. **Input Validation**: Validate stream parameters
2. **Rate Limiting**: Apply appropriate limits to prevent abuse
3. **Authentication**: Ensure streaming endpoints are properly authenticated
4. **Data Exposure**: Verify sensitive data is not exposed in streams

## Dependencies

No additional dependencies required - uses Node.js built-in `stream` module.

## Migration Guide

For developers wanting to add streaming to new endpoints:

1. Add `@StreamResponse()` decorator
2. Import `StreamUtil` utilities
3. Use `@Res() res: Response` parameter
4. Create stream and pipe to response
5. Set appropriate headers

Example:
```typescript
@Get('my-endpoint')
@StreamResponse({ contentType: 'application/json' })
async myEndpoint(@Res() res: Response) {
  const data = await getData();
  const stream = StreamUtil.jsonArrayToStream(data);
  stream.pipe(res);
}
```
