import { Injectable, OnModuleInit } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class S3Service implements OnModuleInit {
  private s3!: AWS.S3;
  private bucketName!: string;

  onModuleInit() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      endpoint: process.env.S3_ENDPOINT,
      s3ForcePathStyle: true, // needed for LocalStack
    });

    if (!process.env.S3_BUCKET_NAME) {
      throw new Error('S3 bucket name is not configured in environment variables.');
    }
    this.bucketName = process.env.S3_BUCKET_NAME;

    this.createBucketIfNotExists();
  }

  private async createBucketIfNotExists() {
    try {
      await this.s3.headBucket({ Bucket: this.bucketName }).promise();
    } catch (error: any) {
      if (error.code === 'NotFound') {
        await this.s3.createBucket({ Bucket: this.bucketName }).promise();
      } else {
        throw error;
      }
    }
  }

  async uploadFile(filePath: string, key: string): Promise<string> {
    const fileStream = fs.createReadStream(filePath);
    const uploadParams = {
      Bucket: this.bucketName,
      Key: key,
      Body: fileStream,
    };
    const result = await this.s3.upload(uploadParams).promise();
    return result.Location;
  }

  async getSignedUrl(key: string): Promise<string> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Expires: 60 * 60, // 1 hour
    };
    return this.s3.getSignedUrlPromise('getObject', params);
  }
}
