import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { IpfsAddResult, IpfsClient } from './ipfs-client';

@Injectable()
export class LocalIpfsClient extends IpfsClient {
  private readonly store = new Map<string, Buffer>();

  async add(content: Buffer): Promise<IpfsAddResult> {
    const digest = createHash('sha256').update(content).digest('hex');
    const cid = `local-${digest}`;
    if (!this.store.has(cid)) {
      this.store.set(cid, Buffer.from(content));
    }
    return { cid, size: content.length };
  }

  async cat(cid: string): Promise<Buffer> {
    const content = this.store.get(cid);
    if (!content) {
      throw new NotFoundException(`Content for CID "${cid}" not found`);
    }
    return Buffer.from(content);
  }
}
