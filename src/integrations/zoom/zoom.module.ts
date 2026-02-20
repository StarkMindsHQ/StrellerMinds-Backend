import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationConfig } from '../common/entities/integration-config.entity';
import { SyncLog } from '../common/entities/sync-log.entity';
import { IntegrationMapping } from '../common/entities/integration-mapping.entity';
import { ZoomService } from './services/zoom.service';
import { ZoomConfigService } from './services/zoom-config.service';
import { ZoomController } from './controllers/zoom.controller';

@Module({
  imports: [TypeOrmModule.forFeature([IntegrationConfig, SyncLog, IntegrationMapping])],
  controllers: [ZoomController],
  providers: [ZoomService, ZoomConfigService],
  exports: [ZoomService, ZoomConfigService],
})
export class ZoomModule {}
