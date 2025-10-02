// src/verification/strategies/ipfs-proof.strategy.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class IpfsProofStrategy {
  constructor(private httpService: HttpService) {}

  async verify(cid: string): Promise<any> {
    try {
      const response = await lastValueFrom(this.httpService.get(`https://ipfs.io/ipfs/${cid}`));
      const data = response.data;
      const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');

      return {
        verified: true,
        hash,
        source: 'ipfs',
      };
    } catch (error) {
      throw new Error('Failed to fetch or validate IPFS data');
    }
  }
}
