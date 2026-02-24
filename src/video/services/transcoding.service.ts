import { Injectable, Logger } from '@nestjs/common';
import { Video, VideoStatus } from '../entities/video.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class TranscodingService {
  private readonly logger = new Logger(TranscodingService.name);

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
  ) {}

  /**
   * Transcodes video to HLS format.
   * In production, this would use ffmpeg to create HLS segments.
   */
  async transcodeToHls(inputPath: string, outputDir: string): Promise<string> {
    this.logger.log(`Transcoding ${inputPath} to HLS in ${outputDir}`);
    // Simulate transcoding delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Return mock manifest path
    return `${outputDir}/master.m3u8`;
  }

  /**
   * Simulates the video transcoding process.
   * In a production environment, this would interface with ffmpeg or a cloud media service (AWS MediaConvert).
   */
  async processVideo(video: Video, filePath: string): Promise<void> {
    this.logger.log(`Starting transcoding for video ${video.id} from ${filePath}`);
    
    // Update status to PROCESSING
    video.status = VideoStatus.PROCESSING;
    await this.videoRepository.save(video);

    // Simulate async processing delay (e.g., 5 seconds)
    setTimeout(async () => {
      try {
        this.logger.log(`Transcoding completed for video ${video.id}`);
        
        // Update video with mock generated assets
        video.status = VideoStatus.READY;
        video.duration = 120; // Mock duration
        video.thumbnailUrl = `https://cdn.strellerminds.com/videos/${video.id}/thumbnail.jpg`;
        video.previewUrl = `https://cdn.strellerminds.com/videos/${video.id}/preview.gif`;
        
        await this.videoRepository.save(video);
        
        // Here we would also create VideoVariant entities for 1080p, 720p, HLS, etc.
        
      } catch (error) {
        this.logger.error(`Transcoding failed for video ${video.id}`, error);
        video.status = VideoStatus.FAILED;
        await this.videoRepository.save(video);
      }
    }, 5000);
  }
}
