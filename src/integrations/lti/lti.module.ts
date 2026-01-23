import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { IntegrationConfig } from '../common/entities/integration-config.entity';
import { SyncLog } from '../common/entities/sync-log.entity';
import { IntegrationMapping } from '../common/entities/integration-mapping.entity';
import { LtiService } from './services/lti.service';
import { LtiConfigService } from './services/lti-config.service';
import { LtiController } from './controllers/lti.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([IntegrationConfig, SyncLog, IntegrationMapping]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
  ],
  controllers: [LtiController],
  providers: [LtiService, LtiConfigService],
  exports: [LtiService, LtiConfigService],
})
export class LtiModule {}
