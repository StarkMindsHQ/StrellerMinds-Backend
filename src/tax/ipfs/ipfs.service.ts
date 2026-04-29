import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { IpfsClient } from './ipfs-client';

export interface IpfsUploadResult {
  cid: string;
  sha256: string;
  size: number;
}

export interface IpfsVerification {
  cid: string;
  expectedSha256: string;
  actualSha256: string;
  matches: boolean;
}

@Injectable()
export class IpfsService {
  constructor(private readonly client: IpfsClient) {}

  async upload(content: Buffer): Promise<IpfsUploadResult> {
    const sha256 = this.hash(content);
    const { cid, size } = await this.client.add(content);
    return { cid, sha256, size };
  }

  async fetch(cid: string): Promise<Buffer> {
    return this.client.cat(cid);
  }

  async verify(cid: string, expectedSha256: string): Promise<IpfsVerification> {
    const content = await this.client.cat(cid);
    const actualSha256 = this.hash(content);
    return {
      cid,
      expectedSha256,
      actualSha256,
      matches: actualSha256 === expectedSha256,
    };
  }

  private hash(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }
}
