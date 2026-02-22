import { Injectable } from '@nestjs/common';

@Injectable()
export class SyncService {
  buildSyncResponse(data: any[], lastSync: string) {
    return {
      serverTime: new Date(),
      lastSync,
      items: data,
    };
  }
}