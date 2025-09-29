# Video Streaming Integration

This module provides comprehensive video streaming capabilities for the StrellerMinds platform, including adaptive streaming, video analytics, security features, and performance monitoring.

## Features

### 🎥 Video Processing
- **Adaptive Streaming**: Automatic generation of multiple quality variants (240p to 4K)
- **HLS & DASH Support**: Industry-standard streaming protocols
- **Thumbnail Generation**: Automatic thumbnail creation at multiple timestamps
- **Preview Generation**: Animated GIF previews for better user experience
- **Watermarking**: Configurable video watermarks for branding

### 🔒 Security Features
- **Signed URLs**: Time-limited access with CloudFront signed URLs
- **Domain Restrictions**: Limit video access to specific domains
- **Geographic Restrictions**: Country-based access control
- **DRM Support**: Integration with Widevine, FairPlay, and PlayReady
- **Access Tokens**: JWT-based video access control
- **Embed Protection**: Configurable embedding permissions

### 📊 Analytics & Monitoring
- **Engagement Metrics**: View counts, watch time, completion rates
- **Performance Metrics**: Load times, buffer events, quality changes
- **Geographic Analytics**: Views by country and region
- **Device Analytics**: Browser, OS, and device type breakdown
- **Quality Analytics**: Adaptive bitrate efficiency and quality distribution
- **Real-time Tracking**: Live analytics event collection

### ☁️ Cloud Infrastructure
- **AWS CloudFront**: Global CDN for fast video delivery
- **S3 Storage**: Scalable video storage with lifecycle management
- **Adaptive Bitrate**: Automatic quality switching based on bandwidth
- **Edge Caching**: Optimized content delivery worldwide

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Video Upload  │───▶│   Processing    │───▶│   CloudFront    │
│                 │    │     Queue       │    │      CDN        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Video Entity  │    │   Quality       │    │   Analytics     │
│   (Metadata)    │    │   Variants      │    │   Collection    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Installation

1. **Install Dependencies**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/client-cloudfront fluent-ffmpeg
```

2. **Configure Environment Variables**
```bash
# AWS Configuration
AWS_CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC
AWS_CLOUDFRONT_DOMAIN=d1234567890abc.cloudfront.net
AWS_S3_BUCKET=your-video-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Video Processing
FFMPEG_PATH=/usr/bin/ffmpeg
VIDEO_PROCESSING_ENABLED=true

# Security
VIDEO_TOKEN_EXPIRY=3600
VIDEO_DRM_ENABLED=false
```

3. **Install FFmpeg**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Docker
FROM node:18-alpine
RUN apk add --no-cache ffmpeg
```

## Usage

### Creating and Uploading Videos

```typescript
import { VideoStreamingService } from './video-streaming.service';

// Create video metadata
const video = await videoStreamingService.createVideo({
  title: 'My Course Video',
  description: 'Introduction to the course',
  originalFilename: 'intro.mp4',
  visibility: VideoVisibility.COURSE_ONLY,
  processingSettings: {
    adaptiveStreaming: true,
    qualityLevels: ['720p', '480p', '360p'],
    generateThumbnails: true,
    thumbnailCount: 5,
  },
  securitySettings: {
    requireAuth: true,
    allowedDomains: ['yourdomain.com'],
    signedUrlExpiry: 3600,
  },
}, user);

// Upload video file
await videoStreamingService.uploadVideoFile(video.id, file);
```

### Getting Streaming Information

```typescript
// Get streaming URLs and security tokens
const streamingInfo = await videoStreamingService.getVideoStreamingInfo(
  videoId,
  userId,
  {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    domain: 'yourdomain.com',
  }
);

// Use in video player
const player = new VideoPlayer({
  src: streamingInfo.streamingUrls.primary,
  hls: streamingInfo.streamingUrls.hls,
  dash: streamingInfo.streamingUrls.dash,
  token: streamingInfo.security.accessToken,
  analytics: {
    sessionId: streamingInfo.analytics.sessionId,
    trackingUrl: streamingInfo.analytics.trackingUrl,
  },
});
```

### Recording Analytics

```typescript
// Record video events
await analyticsService.recordEvent({
  sessionId: 'session_123',
  videoId: 'video_456',
  eventType: AnalyticsEventType.VIEW_START,
  playbackPosition: 0,
  quality: '720p',
  deviceInfo: {
    type: 'desktop',
    browser: 'Chrome',
    os: 'Windows',
  },
});
```

### Getting Analytics

```typescript
// Get comprehensive analytics
const analytics = await videoStreamingService.getVideoAnalytics(videoId, userId);

console.log('Engagement:', analytics.engagement);
console.log('Performance:', analytics.performance);
console.log('Geographic:', analytics.geographic);
console.log('Device:', analytics.device);
console.log('Quality:', analytics.quality);
```

## API Endpoints

### Video Management
- `POST /video-streaming` - Create video
- `POST /video-streaming/:id/upload` - Upload video file
- `GET /video-streaming` - List videos
- `GET /video-streaming/:id` - Get video details
- `GET /video-streaming/:id/stream` - Get streaming info
- `PUT /video-streaming/:id` - Update video
- `DELETE /video-streaming/:id` - Delete video

### Analytics
- `POST /video-analytics/events` - Record analytics event
- `GET /video-analytics/videos/:id/engagement` - Engagement metrics
- `GET /video-analytics/videos/:id/performance` - Performance metrics
- `GET /video-analytics/videos/:id/geographic` - Geographic metrics
- `GET /video-analytics/videos/:id/device` - Device metrics
- `GET /video-analytics/videos/:id/quality` - Quality metrics
- `GET /video-analytics/videos/:id/dashboard` - Complete dashboard

### Security
- `POST /video-streaming/:id/access-token` - Generate access token
- `GET /video-streaming/:id/embed` - Get embed code

## Configuration

### Video Quality Levels
```typescript
const qualitySettings = {
  '240p': { width: 426, height: 240, bitrate: 400 },
  '360p': { width: 640, height: 360, bitrate: 800 },
  '480p': { width: 854, height: 480, bitrate: 1200 },
  '720p': { width: 1280, height: 720, bitrate: 2500 },
  '1080p': { width: 1920, height: 1080, bitrate: 5000 },
};
```

### Security Settings
```typescript
const securitySettings = {
  requireAuth: true,
  allowedDomains: ['yourdomain.com'],
  geoRestrictions: {
    allowedCountries: ['US', 'CA', 'GB'],
  },
  drmEnabled: false,
  signedUrlExpiry: 3600,
  downloadEnabled: false,
  embedEnabled: true,
};
```

## Monitoring

The system provides comprehensive monitoring through:

1. **Video Processing Metrics**: Success rates, processing times, queue health
2. **CDN Performance**: Cache hit rates, origin requests, bandwidth usage
3. **Analytics Collection**: Event processing rates, data quality
4. **Security Events**: Access attempts, token validations, DRM requests

## Best Practices

1. **Video Optimization**
   - Use H.264 codec for maximum compatibility
   - Optimize bitrates for target audiences
   - Generate multiple quality variants
   - Enable adaptive streaming

2. **Security**
   - Always use signed URLs for protected content
   - Implement proper access controls
   - Monitor for unusual access patterns
   - Use DRM for premium content

3. **Performance**
   - Enable CloudFront caching
   - Use appropriate quality levels
   - Monitor buffer events
   - Optimize thumbnail generation

4. **Analytics**
   - Track meaningful engagement metrics
   - Monitor performance indicators
   - Use data for content optimization
   - Implement real-time dashboards

## Troubleshooting

### Common Issues

1. **Video Processing Fails**
   - Check FFmpeg installation
   - Verify file format support
   - Monitor processing queue
   - Check disk space

2. **Streaming Issues**
   - Verify CloudFront configuration
   - Check signed URL generation
   - Monitor CDN performance
   - Validate access tokens

3. **Analytics Not Recording**
   - Check event payload format
   - Verify database connections
   - Monitor queue processing
   - Check authentication

For more detailed troubleshooting, check the application logs and monitoring dashboards.
