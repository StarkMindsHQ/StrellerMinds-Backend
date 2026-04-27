import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    return {
      type: 'postgres',
      host: this.configService.get('DATABASE_HOST', 'localhost'),
      port: this.configService.get<number>('DATABASE_PORT', 5432),
      username: this.configService.get('DATABASE_USER', 'postgres'),
      password: this.configService.get('DATABASE_PASSWORD'),
      database: this.configService.get('DATABASE_NAME', 'strellerminds'),
      
      extra: {
        max: this.configService.get<number>('DATABASE_POOL_MAX', isProduction ? 20 : 5),
        min: this.configService.get<number>('DATABASE_POOL_MIN', isProduction ? 5 : 1),
        idleTimeoutMillis: this.configService.get<number>('DATABASE_IDLE_TIMEOUT', 30000),
        connectionTimeoutMillis: this.configService.get<number>('DATABASE_CONNECTION_TIMEOUT', 10000),
        acquireTimeoutMillis: this.configService.get<number>('DATABASE_ACQUIRE_TIMEOUT', 60000),
        createTimeoutMillis: this.configService.get<number>('DATABASE_CREATE_TIMEOUT', 30000),
        destroyTimeoutMillis: this.configService.get<number>('DATABASE_DESTROY_TIMEOUT', 5000),
        reapIntervalMillis: this.configService.get<number>('DATABASE_REAP_INTERVAL', 1000),
        createRetryIntervalMillis: this.configService.get<number>('DATABASE_CREATE_RETRY_INTERVAL', 200),
      },

      autoLoadEntities: true,
      synchronize: false,
      logging: !isProduction,
    };
  }
}
