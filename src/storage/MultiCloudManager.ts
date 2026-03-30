import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';
import { BlobServiceClient } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

export enum CloudProvider {
  AWS = 'aws',
  GCP = 'gcp',
  AZURE = 'azure'
}

export interface StorageConfig {
  provider: CloudProvider;
  region?: string;
  bucket: string;
  credentials: {
    accessKeyId?: string;
    secretAccessKey?: string;
    projectId?: string;
    keyFilename?: string;
    connectionString?: string;
  };
}

export interface StorageObject {
  key: string;
  body: Buffer | string | Readable;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  etag?: string;
  provider: CloudProvider;
  location?: string;
}

export interface DownloadResult {
  key: string;
  body: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
  provider: CloudProvider;
}

@Injectable()
export class MultiCloudManager {
  private readonly logger = new Logger(MultiCloudManager.name);
  private readonly s3Clients: Map<string, S3Client> = new Map();
  private readonly gcsClients: Map<string, Storage> = new Map();
  private readonly azureClients: Map<string, BlobServiceClient> = new Map();

  constructor(private readonly configService: ConfigService) {}

  private getS3Client(config: StorageConfig): S3Client {
    const clientKey = `${config.provider}-${config.bucket}`;
    if (!this.s3Clients.has(clientKey)) {
      const client = new S3Client({
        region: config.region || 'us-east-1',
        credentials: {
          accessKeyId: config.credentials.accessKeyId,
          secretAccessKey: config.credentials.secretAccessKey,
        },
      });
      this.s3Clients.set(clientKey, client);
    }
    return this.s3Clients.get(clientKey)!;
  }

  private getGCSClient(config: StorageConfig): Storage {
    const clientKey = `${config.provider}-${config.bucket}`;
    if (!this.gcsClients.has(clientKey)) {
      const client = new Storage({
        projectId: config.credentials.projectId,
        keyFilename: config.credentials.keyFilename,
      });
      this.gcsClients.set(clientKey, client);
    }
    return this.gcsClients.get(clientKey)!;
  }

  private getAzureClient(config: StorageConfig): BlobServiceClient {
    const clientKey = `${config.provider}-${config.bucket}`;
    if (!this.azureClients.has(clientKey)) {
      const client = BlobServiceClient.fromConnectionString(
        config.credentials.connectionString || ''
      );
      this.azureClients.set(clientKey, client);
    }
    return this.azureClients.get(clientKey)!;
  }

  async upload(
    storageObject: StorageObject,
    config: StorageConfig,
    redundancy: boolean = true
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    try {
      switch (config.provider) {
        case CloudProvider.AWS:
          results.push(await this.uploadToAWS(storageObject, config));
          break;
        case CloudProvider.GCP:
          results.push(await this.uploadToGCS(storageObject, config));
          break;
        case CloudProvider.AZURE:
          results.push(await this.uploadToAzure(storageObject, config));
          break;
      }

      if (redundancy && results.length > 0) {
        await this.createRedundantCopies(storageObject, config, results[0]);
      }

      this.logger.log(`Successfully uploaded ${storageObject.key} to ${config.provider}`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to upload ${storageObject.key} to ${config.provider}:`, error);
      throw error;
    }
  }

  private async uploadToAWS(storageObject: StorageObject, config: StorageConfig): Promise<UploadResult> {
    const client = this.getS3Client(config);
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: storageObject.key,
      Body: storageObject.body,
      ContentType: storageObject.contentType,
      Metadata: storageObject.metadata,
    });

    const result = await client.send(command);
    return {
      key: storageObject.key,
      etag: result.ETag,
      provider: CloudProvider.AWS,
      location: `https://${config.bucket}.s3.${config.region || 'us-east-1'}.amazonaws.com/${storageObject.key}`,
    };
  }

  private async uploadToGCS(storageObject: StorageObject, config: StorageConfig): Promise<UploadResult> {
    const client = this.getGCSClient(config);
    const bucket = client.bucket(config.bucket);
    const file = bucket.file(storageObject.key);

    const stream = storageObject.body instanceof Readable 
      ? storageObject.body 
      : Readable.from([storageObject.body]);

    await new Promise((resolve, reject) => {
      stream
        .pipe(file.createWriteStream({
          metadata: {
            contentType: storageObject.contentType,
            metadata: storageObject.metadata,
          },
        }))
        .on('finish', resolve)
        .on('error', reject);
    });

    const [metadata] = await file.getMetadata();
    return {
      key: storageObject.key,
      etag: metadata.etag,
      provider: CloudProvider.GCP,
      location: `https://storage.googleapis.com/${config.bucket}/${storageObject.key}`,
    };
  }

  private async uploadToAzure(storageObject: StorageObject, config: StorageConfig): Promise<UploadResult> {
    const client = this.getAzureClient(config);
    const containerClient = client.getContainerClient(config.bucket);
    const blockBlobClient = containerClient.getBlockBlobClient(storageObject.key);

    await blockBlobClient.upload(
      storageObject.body instanceof Buffer ? storageObject.body : Buffer.from(storageObject.body),
      storageObject.body instanceof Buffer ? storageObject.body.length : Buffer.from(storageObject.body).length,
      {
        blobHTTPHeaders: { blobContentType: storageObject.contentType },
        metadata: storageObject.metadata,
      }
    );

    const properties = await blockBlobClient.getProperties();
    return {
      key: storageObject.key,
      etag: properties.etag,
      provider: CloudProvider.AZURE,
      location: blockBlobClient.url,
    };
  }

  async download(key: string, config: StorageConfig): Promise<DownloadResult> {
    try {
      switch (config.provider) {
        case CloudProvider.AWS:
          return await this.downloadFromAWS(key, config);
        case CloudProvider.GCP:
          return await this.downloadFromGCS(key, config);
        case CloudProvider.AZURE:
          return await this.downloadFromAzure(key, config);
        default:
          throw new Error(`Unsupported provider: ${config.provider}`);
      }
    } catch (error) {
      this.logger.error(`Failed to download ${key} from ${config.provider}:`, error);
      throw error;
    }
  }

  private async downloadFromAWS(key: string, config: StorageConfig): Promise<DownloadResult> {
    const client = this.getS3Client(config);
    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    });

    const result = await client.send(command);
    const chunks: Buffer[] = [];

    for await (const chunk of result.Body as Readable) {
      chunks.push(chunk);
    }

    return {
      key,
      body: Buffer.concat(chunks),
      contentType: result.ContentType,
      metadata: result.Metadata,
      provider: CloudProvider.AWS,
    };
  }

  private async downloadFromGCS(key: string, config: StorageConfig): Promise<DownloadResult> {
    const client = this.getGCSClient(config);
    const bucket = client.bucket(config.bucket);
    const file = bucket.file(key);

    const [data] = await file.download();
    const [metadata] = await file.getMetadata();

    return {
      key,
      body: data,
      contentType: metadata.contentType,
      metadata: metadata.metadata,
      provider: CloudProvider.GCP,
    };
  }

  private async downloadFromAzure(key: string, config: StorageConfig): Promise<DownloadResult> {
    const client = this.getAzureClient(config);
    const containerClient = client.getContainerClient(config.bucket);
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    const downloadResponse = await blockBlobClient.download();
    const chunks: Buffer[] = [];

    for await (const chunk of downloadResponse.readableStreamBody as Readable) {
      chunks.push(chunk);
    }

    const properties = await blockBlobClient.getProperties();
    return {
      key,
      body: Buffer.concat(chunks),
      contentType: properties.contentType,
      metadata: properties.metadata,
      provider: CloudProvider.AZURE,
    };
  }

  async delete(key: string, config: StorageConfig): Promise<void> {
    try {
      switch (config.provider) {
        case CloudProvider.AWS:
          await this.deleteFromAWS(key, config);
          break;
        case CloudProvider.GCP:
          await this.deleteFromGCS(key, config);
          break;
        case CloudProvider.AZURE:
          await this.deleteFromAzure(key, config);
          break;
      }
      this.logger.log(`Successfully deleted ${key} from ${config.provider}`);
    } catch (error) {
      this.logger.error(`Failed to delete ${key} from ${config.provider}:`, error);
      throw error;
    }
  }

  private async deleteFromAWS(key: string, config: StorageConfig): Promise<void> {
    const client = this.getS3Client(config);
    const command = new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    });
    await client.send(command);
  }

  private async deleteFromGCS(key: string, config: StorageConfig): Promise<void> {
    const client = this.getGCSClient(config);
    const bucket = client.bucket(config.bucket);
    const file = bucket.file(key);
    await file.delete();
  }

  private async deleteFromAzure(key: string, config: StorageConfig): Promise<void> {
    const client = this.getAzureClient(config);
    const containerClient = client.getContainerClient(config.bucket);
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    await blockBlobClient.delete();
  }

  async listObjects(config: StorageConfig, prefix?: string): Promise<string[]> {
    try {
      switch (config.provider) {
        case CloudProvider.AWS:
          return await this.listAWSObjects(config, prefix);
        case CloudProvider.GCP:
          return await this.listGCSObjects(config, prefix);
        case CloudProvider.AZURE:
          return await this.listAzureObjects(config, prefix);
        default:
          throw new Error(`Unsupported provider: ${config.provider}`);
      }
    } catch (error) {
      this.logger.error(`Failed to list objects from ${config.provider}:`, error);
      throw error;
    }
  }

  private async listAWSObjects(config: StorageConfig, prefix?: string): Promise<string[]> {
    const client = this.getS3Client(config);
    const command = new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: prefix,
    });

    const result = await client.send(command);
    return result.Contents?.map(obj => obj.Key!) || [];
  }

  private async listGCSObjects(config: StorageConfig, prefix?: string): Promise<string[]> {
    const client = this.getGCSClient(config);
    const bucket = client.bucket(config.bucket);
    const [files] = await bucket.getFiles({ prefix });
    return files.map(file => file.name);
  }

  private async listAzureObjects(config: StorageConfig, prefix?: string): Promise<string[]> {
    const client = this.getAzureClient(config);
    const containerClient = client.getContainerClient(config.bucket);
    const objects: string[] = [];

    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      objects.push(blob.name);
    }

    return objects;
  }

  private async createRedundantCopies(
    storageObject: StorageObject,
    originalConfig: StorageConfig,
    originalResult: UploadResult
  ): Promise<void> {
    const redundantProviders = Object.values(CloudProvider).filter(
      provider => provider !== originalConfig.provider
    );

    for (const provider of redundantProviders) {
      try {
        const redundantConfig = this.getRedundantConfig(provider);
        if (redundantConfig) {
          await this.upload(storageObject, redundantConfig, false);
          this.logger.log(`Created redundant copy of ${storageObject.key} in ${provider}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to create redundant copy in ${provider}:`, error);
      }
    }
  }

  private getRedundantConfig(provider: CloudProvider): StorageConfig | null {
    switch (provider) {
      case CloudProvider.AWS:
        return {
          provider: CloudProvider.AWS,
          bucket: this.configService.get<string>('AWS_REDUNDANT_BUCKET'),
          region: this.configService.get<string>('AWS_REDUNDANT_REGION'),
          credentials: {
            accessKeyId: this.configService.get<string>('AWS_REDUNDANT_ACCESS_KEY_ID'),
            secretAccessKey: this.configService.get<string>('AWS_REDUNDANT_SECRET_ACCESS_KEY'),
          },
        };
      case CloudProvider.GCP:
        return {
          provider: CloudProvider.GCP,
          bucket: this.configService.get<string>('GCP_REDUNDANT_BUCKET'),
          credentials: {
            projectId: this.configService.get<string>('GCP_REDUNDANT_PROJECT_ID'),
            keyFilename: this.configService.get<string>('GCP_REDUNDANT_KEY_FILENAME'),
          },
        };
      case CloudProvider.AZURE:
        return {
          provider: CloudProvider.AZURE,
          bucket: this.configService.get<string>('AZURE_REDUNDANT_BUCKET'),
          credentials: {
            connectionString: this.configService.get<string>('AZURE_REDUNDANT_CONNECTION_STRING'),
          },
        };
      default:
        return null;
    }
  }

  async failoverDownload(key: string, configs: StorageConfig[]): Promise<DownloadResult> {
    const errors: Error[] = [];

    for (const config of configs) {
      try {
        return await this.download(key, config);
      } catch (error) {
        errors.push(error as Error);
        this.logger.warn(`Failed to download ${key} from ${config.provider}, trying next provider`);
      }
    }

    this.logger.error(`Failed to download ${key} from all providers:`, errors);
    throw new Error(`All providers failed for key: ${key}`);
  }
}
