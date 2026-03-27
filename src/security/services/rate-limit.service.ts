import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { RateLimitAnalytics } from '../entities/rate-limit-analytics.entity';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimitService {
  private readonly redis: Redis;

  constructor(
    @InjectRepository(RateLimitAnalytics)
    private readonly analyticsRepository: Repository<RateLimitAnalytics>,
    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
    });
  }

  async getAnalytics(limit = 100) {
    return this.analyticsRepository.find({
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getRecentViolations(minutes = 60) {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.analyticsRepository.find({
      where: { timestamp: MoreThan(since) },
      order: { timestamp: 'DESC' },
    });
  }

  async getIpStats(ip: string) {
    const blockKey = `ratelimit:block:${ip}`;
    const violationKey = `ratelimit:violations:${ip}`;
    
    const [isBlocked, violations, ttl] = await Promise.all([
      this.redis.exists(blockKey),
      this.redis.get(violationKey),
      this.redis.ttl(blockKey),
    ]);

    return {
      ip,
      isBlocked: !!isBlocked,
      violationCount: parseInt(violations || '0', 10),
      blockTtl: ttl > 0 ? ttl : 0,
    };
  }

  async blockIp(ip: string, durationSeconds: number) {
    const blockKey = `ratelimit:block:${ip}`;
    await this.redis.setex(blockKey, durationSeconds, 'manual_block');
    return { success: true, ip, durationSeconds };
  }

  async unblockIp(ip: string) {
    const blockKey = `ratelimit:block:${ip}`;
    const violationKey = `ratelimit:violations:${ip}`;
    await this.redis.del(blockKey, violationKey);
    return { success: true, ip };
  }
}
