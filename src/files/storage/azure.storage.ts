import { Injectable } from '@nestjs/common';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { StorageProvider } from './storage.interface';

@Injectable()
export class AzureStorageService implements StorageProvider {
  private blobServiceClient: BlobServiceClient;
  private containerClient: any;

  constructor() {
    const sharedKeyCredential = new StorageSharedKeyCredential(
      process.env.AZURE_STORAGE_ACCOUNT_NAME,
      process.env.AZURE_STORAGE_ACCOUNT_KEY,
    );
    this.blobServiceClient = new BlobServiceClient(
      `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
      sharedKeyCredential,
    );
    this.containerClient = this.blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER);
  }

  async upload(buffer: Buffer, path: string, mimeType: string) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(path);
    const response = await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: mimeType },
    });
    return { path, versionId: response.versionId };
  }

  async delete(path: string, versionId?: string) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(path);
    await blockBlobClient.delete({ versionId });
  }

  getPublicUrl(path: string, versionId?: string) {
    let url = `${this.containerClient.url}/${path}`;
    if (versionId) {
      url += `?versionId=${versionId}`;
    }
    return url;
  }

  async download(path: string, versionId?: string): Promise<Buffer> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(path);
    const response = await blockBlobClient.download(0, undefined, { versionId });
    return this.streamToBuffer(response.readableStreamBody);
  }

  private async streamToBuffer(readableStream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      readableStream.on('data', (data: any) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      });
      readableStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      readableStream.on('error', reject);
    });
  }
}
