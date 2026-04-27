import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DatabaseMonitorService {
  private readonly logger = new Logger(DatabaseMonitorService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async monitorDatabase() {
    try {
      const isConnected = this.dataSource.isInitialized;
      if (!isConnected) {
        this.logger.warn('Database connection is not initialized');
      }
    } catch (error) {
      this.logger.error('Database monitoring error:', error);
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Database connection check failed:', error);
      return false;
    }
  }
}
