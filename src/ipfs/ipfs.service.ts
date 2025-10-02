import { Injectable } from '@nestjs/common';
import { create } from 'ipfs-http-client';
import NodeCache from 'node-cache';
import { of as hashOf } from 'ipfs-only-hash';
import { ApiTags } from '@nestjs/swagger';

/**
 * Service for interacting with IPFS: add, retrieve, and verify content.
 */
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

  /**
   * Add a file to IPFS and cache it.
   * @param content Buffer of the file content.
   * @returns The CID of the stored content.
   */
  async addFile(content: Buffer): Promise<string> {
    try {
      const { cid } = await this.ipfs.add(content);
      this.cache.set(cid.toString(), content);
      return cid.toString();
    } catch (error) {
      throw new Error('Error adding file to IPFS');
    }
  }

  /**
   * Retrieve a file from IPFS by CID, using cache if available.
   * @param cid The Content Identifier.
   * @returns The content as a string.
   */
  async getFile(cid: string): Promise<string> {
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

  /**
   * Verify that the content matches the given CID.
   * @param cid The Content Identifier.
   * @param content The content buffer to verify.
   * @returns True if the content matches the CID, false otherwise.
   */
  async verifyContent(cid: string, content: Buffer): Promise<boolean> {
    const hash = await hashOf(content, { cidVersion: 0 });
    return hash === cid;
  }
}
