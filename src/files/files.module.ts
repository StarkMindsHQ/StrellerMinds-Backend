import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesService } from './files.service';
import { FileEntity } from './entities/file.entity';
import { FileVersionEntity } from './entities/file-version.entity';
import { FilePermissionEntity } from './entities/file-permission.entity';
import { FileAnalyticsEntity } from './entities/file-analytics.entity';
import { ImageProcessor } from './processors/image.processor';
import { VideoProcessor } from './processors/video.processor';
import { VirusScanService } from './virus-scan.service';
import { S3StorageService } from './storage/s3.storage';
import { GCSStorageService } from './storage/gcs.storage';
import { AzureStorageService } from './storage/azure.storage';
import { StorageProviderFactory } from './storage/storage-provider.factory';
import { FilesController } from './files.controller';
import { FileProcessorConsumer } from './processors/file-processor.consumer';
import { QueueModule } from '../common/queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FileEntity,
      FileVersionEntity,
      FilePermissionEntity,
      FileAnalyticsEntity,
    ]),
    QueueModule, // Import the centralized queue module
  ],
  controllers: [FilesController],
  providers: [
    FilesService,
    ImageProcessor,
    VideoProcessor,
    VirusScanService,
    S3StorageService,
    GCSStorageService,
    AzureStorageService,
    StorageProviderFactory,
    FileProcessorConsumer, // Add the file processor consumer
    {
      provide: 'StorageProvider',
      useClass: S3StorageService,
    },
  ],
  exports: [FilesService, 'StorageProvider'],
})
export class FilesModule {}
