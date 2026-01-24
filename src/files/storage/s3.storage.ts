import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { StorageProvider } from './storage.interface';

@Injectable()
export class S3StorageService implements StorageProvider {
  private s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  async upload(buffer: Buffer, path: string, mimeType: string) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: path,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
  }

  async delete(path: string) {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: path,
      }),
    );
  }

  getPublicUrl(path: string) {
    return `${process.env.CDN_URL}/${path}`;
  }
}
