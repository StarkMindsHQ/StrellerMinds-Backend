import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LtiModule } from './lti/lti.module';
import { ZoomModule } from './zoom/zoom.module';
import { GoogleModule } from './google/google.module';
import { MicrosoftModule } from './microsoft/microsoft.module';
import { SSOModule } from './sso/sso.module';
import { SyncModule } from './sync/sync.module';
import { IntegrationConfig } from './common/entities/integration-config.entity';
import { SyncLog } from './common/entities/sync-log.entity';
import { IntegrationMapping } from './common/entities/integration-mapping.entity';
import { IntegrationDashboardController } from './integration-dashboard.controller';
import { SyncEngineService } from './sync/services/sync-engine.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([IntegrationConfig, SyncLog, IntegrationMapping]),
    LtiModule,
    ZoomModule,
    GoogleModule,
    MicrosoftModule,
    SSOModule,
    SyncModule,
  ],
  controllers: [IntegrationDashboardController],
  providers: [SyncEngineService],
  exports: [
    TypeOrmModule,
    LtiModule,
    ZoomModule,
    GoogleModule,
    MicrosoftModule,
    SSOModule,
    SyncModule,
    SyncEngineService,
  ],
})
export class IntegrationsModule {}
