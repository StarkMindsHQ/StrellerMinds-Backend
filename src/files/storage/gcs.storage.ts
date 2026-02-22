import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { StorageProvider } from './storage.interface';

@Injectable()
export class GCSStorageService implements StorageProvider {
  private storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: JSON.parse(process.env.GCP_CREDENTIALS),
  });
  private bucket = this.storage.bucket(process.env.GCP_BUCKET);

  async upload(buffer: Buffer, path: string, mimeType: string) {
    const file = this.bucket.file(path);
    await file.save(buffer, {
      contentType: mimeType,
      resumable: false,
    });

    // GCS doesn't return versionId on save like S3 unless versioning is enabled on bucket
    // For now we return path, metadata can be enriched later
    const [metadata] = await file.getMetadata();
    return { path, versionId: metadata.generation?.toString() };
  }

  async delete(path: string, versionId?: string) {
    const file = this.bucket.file(path, versionId ? { generation: versionId } : {});
    await file.delete();
  }

  getPublicUrl(path: string, versionId?: string) {
    let url = `https://storage.googleapis.com/${process.env.GCP_BUCKET}/${path}`;
    if (versionId) {
      url += `?generation=${versionId}`;
    }
    return url;
  }

  async download(path: string, versionId?: string): Promise<Buffer> {
    const file = this.bucket.file(path, versionId ? { generation: versionId } : {});
    const [content] = await file.download();
    return content;
  }
}
