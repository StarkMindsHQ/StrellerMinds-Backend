import { Injectable, Logger } from '@nestjs/common';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { StorageProvider } from './storage.interface';

@Injectable()
export class AzureStorageService implements StorageProvider {
  private readonly logger = new Logger(AzureStorageService.name);
  private blobServiceClient: BlobServiceClient | undefined;
  private containerClient: any;

  private initialize() {
    if (this.blobServiceClient) return;

    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const container = process.env.AZURE_STORAGE_CONTAINER;

    if (!accountName || !accountKey || !container) {
      throw new Error(
        'AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY, or AZURE_STORAGE_CONTAINER environment variable is not set',
      );
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    this.blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential,
    );
    this.containerClient = this.blobServiceClient.getContainerClient(container);
  }

  async upload(buffer: Buffer, path: string, mimeType: string) {
    this.initialize();
    const blockBlobClient = this.containerClient.getBlockBlobClient(path);
    const response = await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: mimeType },
    });
    return { path, versionId: response.versionId };
  }

  async delete(path: string, versionId?: string) {
    this.initialize();
    const blockBlobClient = this.containerClient.getBlockBlobClient(path);
    await blockBlobClient.delete({ versionId });
  }

  getPublicUrl(path: string, versionId?: string) {
    this.initialize();
    let url = `${this.containerClient.url}/${path}`;
    if (versionId) {
      url += `?versionId=${versionId}`;
    }
    return url;
  }

  async download(path: string, versionId?: string): Promise<Buffer> {
    this.initialize();
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
