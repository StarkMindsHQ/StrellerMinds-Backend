import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPersistenceEntity } from '../user/infrastructure/persistence/user-persistence.entity';
import { DataRetentionService } from './data-retention.service';
import { GdprController } from './gdpr.controller';
import { GdprService } from './gdpr.service';
import { DATA_EXPORTER } from './interfaces/data-exporter.interface';
import { JsonDataExporter } from './strategies/json-data-exporter.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([UserPersistenceEntity])],
  controllers: [GdprController],
  providers: [
    GdprService,
    DataRetentionService,
    JsonDataExporter,
    {
      provide: DATA_EXPORTER,
      useClass: JsonDataExporter,
    },
  ],
})
export class GdprModule {}
