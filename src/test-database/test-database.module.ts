import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TestDataFactory } from './factories/test-data.factory';
import { TestDataManager } from './services/test-data-manager.service';
import { TestDatabaseService } from './services/test-database.service';
import { TestDataCleanupService } from './services/test-data-cleanup.service';
import { TestDataVersioningService } from './services/test-data-versioning.service';
import { TestDatabaseSeeder } from './services/test-database-seeder.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('TEST_DB_HOST', 'localhost'),
        port: configService.get('TEST_DB_PORT', 5433),
        username: configService.get('TEST_DB_USERNAME', 'test_user'),
        password: configService.get('TEST_DB_PASSWORD', 'test_password'),
        database: configService.get('TEST_DB_NAME', 'strellerminds_test'),
        entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'test',
        logging: configService.get('NODE_ENV') === 'test',
        dropSchema: configService.get('NODE_ENV') === 'test',
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    TestDataFactory,
    TestDataManager,
    TestDatabaseService,
    TestDataCleanupService,
    TestDataVersioningService,
    TestDatabaseSeeder,
  ],
  exports: [
    TestDataFactory,
    TestDataManager,
    TestDatabaseService,
    TestDataCleanupService,
    TestDataVersioningService,
    TestDatabaseSeeder,
  ],
})
export class TestDatabaseModule {}
