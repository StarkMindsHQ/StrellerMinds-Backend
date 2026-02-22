import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StreamingService } from '../services/streaming.service';
import { VideoService } from '../services/video.service';
import { Response } from 'express';

@ApiTags('Video Streaming')
@Controller('stream')
export class StreamingController {
  constructor(
    private readonly streamingService: StreamingService,
    private readonly videoService: VideoService,
  ) {}

  @Get(':videoId/manifest.m3u8')
  @ApiOperation({ summary: 'Get HLS manifest for video streaming' })
  async getManifest(@Param('videoId') videoId: string, @Res() res: Response) {
    const video = await this.videoService.findOne(videoId);
    const url = await this.streamingService.getStreamUrl(video);
    
    // In a real implementation, this would redirect to the CDN
    // res.redirect(url);
    return res.json({ streamUrl: url });
  }
}