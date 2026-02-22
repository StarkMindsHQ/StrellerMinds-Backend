import { Logger } from '@nestjs/common';
import { Logger as TypeOrmLogger, QueryRunner } from 'typeorm';

export class CustomTypeOrmLogger implements TypeOrmLogger {
  private readonly logger = new Logger('TypeORM');
  private slowQueryThreshold = 200; // ms

  logQuery(query: string, parameters?: any[]) {
    // optional: log all queries in dev
  }

  logQueryError(error: string, query: string, parameters?: any[]) {
    this.logger.error(`Query Error: ${error}`);
    this.logger.error(`Query: ${query}`);
  }

  logQuerySlow(time: number, query: string, parameters?: any[]) {
    if (time > this.slowQueryThreshold) {
      this.logger.warn(
        `Slow Query (${time}ms): ${query}`,
      );
    }
  }

  logSchemaBuild(message: string) {}
  logMigration(message: string) {}
  log(level: 'log' | 'info' | 'warn', message: any) {}
}