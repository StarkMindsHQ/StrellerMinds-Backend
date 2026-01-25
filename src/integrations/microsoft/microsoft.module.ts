import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationConfig } from '../common/entities/integration-config.entity';
import { SyncLog } from '../common/entities/sync-log.entity';
import { IntegrationMapping } from '../common/entities/integration-mapping.entity';
import { MicrosoftService } from './services/microsoft.service';
import { MicrosoftConfigService } from './services/microsoft-config.service';
import { MicrosoftController } from './controllers/microsoft.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([IntegrationConfig, SyncLog, IntegrationMapping]),
  ],
  controllers: [MicrosoftController],
  providers: [MicrosoftService, MicrosoftConfigService],
  exports: [MicrosoftService, MicrosoftConfigService],
})
export class MicrosoftModule {}
