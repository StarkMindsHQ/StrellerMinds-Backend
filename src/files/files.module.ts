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

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity, FileVersionEntity, FilePermissionEntity, FileAnalyticsEntity])],
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
    {
      provide: 'StorageProvider',
      useClass: S3StorageService,
    },
  ],
  exports: [FilesService, 'StorageProvider'],
})
export class FilesModule {}
