import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class MobileService {
  constructor(private readonly dataSource: DataSource) {}

  async getOptimizedFeed(userId: string, updatedSince?: string) {
    const query = this.dataSource
      .createQueryBuilder()
      .select([
        'item.id',
        'item.title',
        'item.thumbnail',
        'item.updatedAt',
      ])
      .from('items', 'item')
      .orderBy('item.updatedAt', 'DESC')
      .limit(20);

    if (updatedSince) {
      query.andWhere('item.updatedAt > :date', { date: updatedSince });
    }

    return query.getRawMany();
  }
}