import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { IntegrationConfig } from '../common/entities/integration-config.entity';
import { SSOService } from './services/sso.service';
import { SSOConfigService } from './services/sso-config.service';
import { SSOController } from './controllers/sso.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([IntegrationConfig]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
  ],
  controllers: [SSOController],
  providers: [SSOService, SSOConfigService],
  exports: [SSOService, SSOConfigService],
})
export class SSOModule {}
