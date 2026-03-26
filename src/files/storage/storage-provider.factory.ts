import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3StorageService } from './s3.storage';
import { GCSStorageService } from './gcs.storage';
import { AzureStorageService } from './azure.storage';
import { StorageProvider } from './storage.interface';

@Injectable()
export class StorageProviderFactory {
  constructor(
    private readonly s3: S3StorageService,
    private readonly gcs: GCSStorageService,
    private readonly azure: AzureStorageService,
  ) {}

  getProvider(provider?: 'aws' | 'gcs' | 'azure'): StorageProvider {
    const type = provider || process.env.DEFAULT_STORAGE_PROVIDER || 'aws';

    switch (type) {
      case 'aws':
        return this.s3;
      case 'gcs':
        return this.gcs;
      case 'azure':
        return this.azure;
      default:
        throw new InternalServerErrorException(`Unsupported storage provider: ${type}`);
    }
  }
}
