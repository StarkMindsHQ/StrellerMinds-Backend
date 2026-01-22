import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesService } from './files.service';
import { FileEntity } from './entities/file.entity';
import { ImageProcessor } from './processors/image.processor';
import { VideoProcessor } from './processors/video.processor';
import { VirusScanService } from './virus-scan.service';
import { S3StorageService } from './storage/s3.storage';
import { FilesController } from './files.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity])],
  controllers: [FilesController],
  providers: [
    FilesService,
    ImageProcessor,
    VideoProcessor,
    VirusScanService,
    {
      provide: 'StorageProvider',
      useClass: S3StorageService,
    },
  ],
  exports: [FilesService],
})
export class FilesModule {}
