import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import {
  CloudFrontClient,
  CreateInvalidationCommand,
  GetDistributionCommand,
} from '@aws-sdk/client-cloudfront';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

export interface CloudFrontConfig {
  distributionId: string;
  distributionDomain: string;
  s3Bucket: string;
  s3Region: string;
  accessKeyId: string;
  secretAccessKey: string;
  signedUrlExpiry: number;
  privateKeyId: string;
  privateKey: string;
}

export interface UploadResult {
  key: string;
  url: string;
  cdnUrl: string;
  etag: string;
  size: number;
}

export interface SignedUrlOptions {
  expiresIn?: number;
  ipAddress?: string;
  userAgent?: string;
  policy?: any;
}

@Injectable()
export class AwsCloudFrontService {
  private readonly logger = new Logger(AwsCloudFrontService.name);
  private readonly s3Client: S3Client;
  private readonly cloudFrontClient: CloudFrontClient;
  private readonly config: CloudFrontConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      distributionId: this.configService.get<string>('AWS_CLOUDFRONT_DISTRIBUTION_ID'),
      distributionDomain: this.configService.get<string>('AWS_CLOUDFRONT_DOMAIN'),
      s3Bucket: this.configService.get<string>('AWS_S3_BUCKET'),
      s3Region: this.configService.get<string>('AWS_S3_REGION', 'us-east-1'),
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      signedUrlExpiry: this.configService.get<number>('AWS_SIGNED_URL_EXPIRY', 3600),
      privateKeyId: this.configService.get<string>('AWS_CLOUDFRONT_PRIVATE_KEY_ID'),
      privateKey: this.configService.get<string>('AWS_CLOUDFRONT_PRIVATE_KEY'),
    };

    this.s3Client = new S3Client({
      region: this.config.s3Region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });

    this.cloudFrontClient = new CloudFrontClient({
      region: this.config.s3Region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  async uploadVideo(
    buffer: Buffer,
    key: string,
    contentType: string = 'video/mp4',
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    try {
      this.logger.debug(`Uploading video to S3: ${key}`);

      const command = new PutObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
        ServerSideEncryption: 'AES256',
        CacheControl: 'max-age=31536000', // 1 year
      });

      const result = await this.s3Client.send(command);
      const s3Url = `https://${this.config.s3Bucket}.s3.${this.config.s3Region}.amazonaws.com/${key}`;
      const cdnUrl = `https://${this.config.distributionDomain}/${key}`;

      this.logger.debug(`Video uploaded successfully: ${key}`);

      return {
        key,
        url: s3Url,
        cdnUrl,
        etag: result.ETag?.replace(/"/g, '') || '',
        size: buffer.length,
      };
    } catch (error) {
      this.logger.error(`Failed to upload video: ${key}`, error.stack);
      throw error;
    }
  }

  async uploadVideoStream(
    stream: NodeJS.ReadableStream,
    key: string,
    contentType: string = 'video/mp4',
    contentLength?: number,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    try {
      this.logger.debug(`Uploading video stream to S3: ${key}`);

      const command = new PutObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: key,
        Body: stream,
        ContentType: contentType,
        ContentLength: contentLength,
        Metadata: metadata,
        ServerSideEncryption: 'AES256',
        CacheControl: 'max-age=31536000',
      });

      const result = await this.s3Client.send(command);
      const s3Url = `https://${this.config.s3Bucket}.s3.${this.config.s3Region}.amazonaws.com/${key}`;
      const cdnUrl = `https://${this.config.distributionDomain}/${key}`;

      this.logger.debug(`Video stream uploaded successfully: ${key}`);

      return {
        key,
        url: s3Url,
        cdnUrl,
        etag: result.ETag?.replace(/"/g, '') || '',
        size: contentLength || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to upload video stream: ${key}`, error.stack);
      throw error;
    }
  }

  async deleteVideo(key: string): Promise<void> {
    try {
      this.logger.debug(`Deleting video from S3: ${key}`);

      const command = new DeleteObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      // Invalidate CloudFront cache
      await this.invalidateCache([key]);

      this.logger.debug(`Video deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete video: ${key}`, error.stack);
      throw error;
    }
  }

  async getVideoMetadata(key: string): Promise<{
    contentLength: number;
    contentType: string;
    lastModified: Date;
    etag: string;
    metadata: Record<string, string>;
  }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: key,
      });

      const result = await this.s3Client.send(command);

      return {
        contentLength: result.ContentLength || 0,
        contentType: result.ContentType || '',
        lastModified: result.LastModified || new Date(),
        etag: result.ETag?.replace(/"/g, '') || '',
        metadata: result.Metadata || {},
      };
    } catch (error) {
      this.logger.error(`Failed to get video metadata: ${key}`, error.stack);
      throw error;
    }
  }

  async generateSignedUrl(
    key: string,
    options: SignedUrlOptions = {},
  ): Promise<string> {
    try {
      const expiresIn = options.expiresIn || this.config.signedUrlExpiry;

      if (this.config.privateKey && this.config.privateKeyId) {
        // Use CloudFront signed URLs for better security
        return this.generateCloudFrontSignedUrl(key, expiresIn, options);
      } else {
        // Fallback to S3 signed URLs
        return this.generateS3SignedUrl(key, expiresIn);
      }
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${key}`, error.stack);
      throw error;
    }
  }

  private async generateS3SignedUrl(key: string, expiresIn: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  private generateCloudFrontSignedUrl(
    key: string,
    expiresIn: number,
    options: SignedUrlOptions,
  ): string {
    const url = `https://${this.config.distributionDomain}/${key}`;
    const expiration = Math.floor(Date.now() / 1000) + expiresIn;

    // Create policy
    const policy = options.policy || {
      Statement: [
        {
          Resource: url,
          Condition: {
            DateLessThan: {
              'AWS:EpochTime': expiration,
            },
            ...(options.ipAddress && {
              IpAddress: {
                'AWS:SourceIp': options.ipAddress,
              },
            }),
          },
        },
      ],
    };

    const policyString = JSON.stringify(policy);
    const policyBase64 = Buffer.from(policyString).toString('base64');

    // Create signature
    const signature = crypto
      .createSign('RSA-SHA1')
      .update(policyString)
      .sign(this.config.privateKey, 'base64');

    // URL-safe base64 encoding
    const urlSafePolicy = policyBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const urlSafeSignature = signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return `${url}?Policy=${urlSafePolicy}&Signature=${urlSafeSignature}&Key-Pair-Id=${this.config.privateKeyId}`;
  }

  async invalidateCache(paths: string[]): Promise<void> {
    try {
      if (!this.config.distributionId) {
        this.logger.warn('CloudFront distribution ID not configured, skipping cache invalidation');
        return;
      }

      this.logger.debug(`Invalidating CloudFront cache for paths: ${paths.join(', ')}`);

      const command = new CreateInvalidationCommand({
        DistributionId: this.config.distributionId,
        InvalidationBatch: {
          Paths: {
            Quantity: paths.length,
            Items: paths.map(path => `/${path}`),
          },
          CallerReference: `invalidation-${Date.now()}`,
        },
      });

      const result = await this.cloudFrontClient.send(command);

      this.logger.debug(`Cache invalidation created: ${result.Invalidation?.Id}`);
    } catch (error) {
      this.logger.error('Failed to invalidate CloudFront cache', error.stack);
      throw error;
    }
  }

  async getDistributionInfo(): Promise<any> {
    try {
      if (!this.config.distributionId) {
        throw new Error('CloudFront distribution ID not configured');
      }

      const command = new GetDistributionCommand({
        Id: this.config.distributionId,
      });

      const result = await this.cloudFrontClient.send(command);
      return result.Distribution;
    } catch (error) {
      this.logger.error('Failed to get distribution info', error.stack);
      throw error;
    }
  }

  generateVideoKey(
    videoId: string,
    quality?: string,
    format: string = 'mp4',
  ): string {
    const timestamp = Date.now();
    const qualityPrefix = quality ? `${quality}/` : '';
    return `videos/${videoId}/${qualityPrefix}${timestamp}.${format}`;
  }

  generateThumbnailKey(videoId: string, index: number = 0): string {
    return `videos/${videoId}/thumbnails/thumb_${index.toString().padStart(3, '0')}.jpg`;
  }

  generateManifestKey(videoId: string, type: 'hls' | 'dash'): string {
    const extension = type === 'hls' ? 'm3u8' : 'mpd';
    return `videos/${videoId}/manifests/playlist.${extension}`;
  }

  isConfigured(): boolean {
    return !!(
      this.config.distributionDomain &&
      this.config.s3Bucket &&
      this.config.accessKeyId &&
      this.config.secretAccessKey
    );
  }
}
