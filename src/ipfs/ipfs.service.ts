import { Injectable } from '@nestjs/common';
import { create } from 'ipfs-http-client';
import NodeCache from 'node-cache';

@Injectable()
export class IpfsService {
  private ipfs;
  private cache: NodeCache;

  constructor() {
    this.ipfs = create({
      url: 'https://ipfs.infura.io:5001/api/v0',
    });
    this.cache = new NodeCache({ stdTTL: 100, checkperiod: 120 });
  }

  async addFile(content: Buffer) {
    try {
      const { cid } = await this.ipfs.add(content);
      this.cache.set(cid.toString(), content);
      return cid.toString();
    } catch (error) {
      throw new Error('Error adding file to IPFS');
    }
  }

  async getFile(cid: string) {
    try {
      const cachedContent = this.cache.get(cid);
      if (cachedContent) {
        return cachedContent.toString();
      }

      const stream = this.ipfs.cat(cid);
      let data = '';

      for await (const chunk of stream) {
        data += chunk.toString();
      }

      this.cache.set(cid, data);
      return data;
    } catch (error) {
      throw new Error('Error retrieving file from IPFS');
    }
  }

  verifyContent(cid: string, content: Buffer) {
    const hash = this.ipfs.hash(content);
    return hash === cid;
  }
}
