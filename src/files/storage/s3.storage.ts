import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
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
    const response = await this.s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: path,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    return { path, versionId: response.VersionId };
  }

  async delete(path: string, versionId?: string) {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: path,
        VersionId: versionId,
      }),
    );
  }

  getPublicUrl(path: string, versionId?: string) {
    let url = `${process.env.CDN_URL}/${path}`;
    if (versionId) {
      url += `?versionId=${versionId}`;
    }
    return url;
  }

  async download(path: string, versionId?: string): Promise<Buffer> {
    const response = await this.s3.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: path,
        VersionId: versionId,
      }),
    );
    const streamToBuffer = (stream: any): Promise<Buffer> =>
      new Promise((resolve, reject) => {
        const chunks: any[] = [];
        stream.on('data', (chunk: any) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    return streamToBuffer(response.Body);
  }
}
