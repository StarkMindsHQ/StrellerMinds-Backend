import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationConfig } from '../common/entities/integration-config.entity';
import { SyncLog } from '../common/entities/sync-log.entity';
import { IntegrationMapping } from '../common/entities/integration-mapping.entity';
import { GoogleService } from './services/google.service';
import { GoogleConfigService } from './services/google-config.service';
import { GoogleController } from './controllers/google.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([IntegrationConfig, SyncLog, IntegrationMapping]),
  ],
  controllers: [GoogleController],
  providers: [GoogleService, GoogleConfigService],
  exports: [GoogleService, GoogleConfigService],
})
export class GoogleModule {}
