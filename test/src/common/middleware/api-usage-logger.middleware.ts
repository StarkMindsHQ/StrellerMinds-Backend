import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiUsageLog } from '../entities/api-usage-log.entity';

@Injectable()
export class ApiUsageLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiUsageLoggerMiddleware.name);

  constructor(
    @InjectRepository(ApiUsageLog)
    private readonly apiUsageLogRepository: Repository<ApiUsageLog>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    res.on('finish', async () => {
      try {
        await this.apiUsageLogRepository.save({
          version: req.headers['x-api-version'] as string,
          endpoint: req.originalUrl,
          userAgent: req.headers['user-agent'],
          deprecated: false, // You can enhance this logic
        });
      } catch (err) {
        this.logger.error('Failed to log API usage', err);
      }
    });
    next();
  }
}
