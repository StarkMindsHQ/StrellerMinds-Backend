import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class ShardKeyService {
  private readonly shardCount: number;

  constructor() {
    this.shardCount = 4; // Default shard count
  }

  /**
   * Determines which shard a record should be stored in based on consistent hashing
   */
  getShardId(shardKey: string, totalShards: number = this.shardCount): string {
    if (!shardKey) {
      throw new Error('Shard key cannot be null or undefined');
    }

    const hash = this.consistentHash(shardKey);
    const shardIndex = hash % totalShards;
    return `shard-${shardIndex}`;
  }

  /**
   * Consistent hashing algorithm for even distribution
   */
  private consistentHash(key: string): number {
    const hash = createHash('md5').update(key).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }

  /**
   * Range-based sharding for numeric keys
   */
  getShardIdByRange(numericKey: number, totalShards: number = this.shardCount): string {
    const rangeSize = Math.floor(Number.MAX_SAFE_INTEGER / totalShards);
    const shardIndex = Math.floor(numericKey / rangeSize);
    return `shard-${Math.min(shardIndex, totalShards - 1)}`;
  }

  /**
   * Simple hash-based sharding
   */
  getShardIdByHash(key: string, totalShards: number = this.shardCount): string {
    const hash = createHash('sha256').update(key).digest('hex');
    const numericHash = parseInt(hash.substring(0, 8), 16);
    const shardIndex = numericHash % totalShards;
    return `shard-${shardIndex}`;
  }

  /**
   * Extracts shard key from entity based on sharding strategy
   */
  extractShardKey(entity: any, strategy: string): string {
    switch (strategy) {
      case 'user':
        return entity.userId || entity.id;
      case 'course':
        return entity.instructorId || entity.createdBy || entity.id;
      case 'shared':
        return entity.id;
      default:
        return entity.id;
    }
  }

  /**
   * Gets all shard IDs for a query (for cross-shard operations)
   */
  getAllShardIds(totalShards: number = this.shardCount): string[] {
    return Array.from({ length: totalShards }, (_, i) => `shard-${i}`);
  }

  /**
   * Validates shard key format
   */
  validateShardKey(shardKey: string): boolean {
    return shardKey && typeof shardKey === 'string' && shardKey.length > 0;
  }

  /**
   * Gets shard distribution statistics
   */
  getShardDistribution(keys: string[], totalShards: number = this.shardCount): Map<string, number> {
    const distribution = new Map<string, number>();
    
    // Initialize distribution map
    for (let i = 0; i < totalShards; i++) {
      distribution.set(`shard-${i}`, 0);
    }

    // Count keys per shard
    keys.forEach(key => {
      const shardId = this.getShardId(key, totalShards);
      distribution.set(shardId, (distribution.get(shardId) || 0) + 1);
    });

    return distribution;
  }
}
