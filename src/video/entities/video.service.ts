import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, VideoStatus } from '../entities/video.entity';
import { CreateVideoDto } from '../dto/create-video.dto';
import { UpdateVideoDto } from '../dto/update-video.dto';
import { TranscodingService } from './transcoding.service';

@Injectable()
export class VideoService {
  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    private transcodingService: TranscodingService,
  ) {}

  async create(createVideoDto: CreateVideoDto, uploaderId: string, file: Express.Multer.File): Promise<Video> {
    const video = this.videoRepository.create({
      ...createVideoDto,
      uploaderId,
      originalFileName: file.originalname,
      status: VideoStatus.PENDING,
    });

    const savedVideo = await this.videoRepository.save(video);

    // Trigger async transcoding process
    // In a real app, file.path would be the path to the uploaded file (local or S3 key)
    this.transcodingService.processVideo(savedVideo, file.path || 'temp/path');

    return savedVideo;
  }

  async findAll(uploaderId?: string): Promise<Video[]> {
    const query = this.videoRepository.createQueryBuilder('video')
      .leftJoinAndSelect('video.variants', 'variants')
      .leftJoinAndSelect('video.analytics', 'analytics');
      
    if (uploaderId) {
      query.where('video.uploaderId = :uploaderId', { uploaderId });
    }
    
    return query.getMany();
  }

  async findOne(id: string): Promise<Video> {
    const video = await this.videoRepository.findOne({ 
      where: { id }, 
      relations: ['variants', 'analytics'] 
    });
    
    if (!video) {
      throw new NotFoundException(`Video with ID ${id} not found`);
    }
    return video;
  }

  async update(id: string, updateVideoDto: UpdateVideoDto): Promise<Video> {
    const video = await this.findOne(id);
    Object.assign(video, updateVideoDto);
    return this.videoRepository.save(video);
  }

  async remove(id: string): Promise<void> {
    const video = await this.findOne(id);
    await this.videoRepository.remove(video);
  }
}