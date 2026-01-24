import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncLog } from '../common/entities/sync-log.entity';
import { IntegrationMapping } from '../common/entities/integration-mapping.entity';
import { IntegrationConfig } from '../common/entities/integration-config.entity';
import { SyncEngineService } from './services/sync-engine.service';
import { SyncController } from './controllers/sync.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncLog, IntegrationMapping, IntegrationConfig]),
  ],
  controllers: [SyncController],
  providers: [SyncEngineService],
  exports: [SyncEngineService],
})
export class SyncModule {}
