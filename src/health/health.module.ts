import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { User } from '../user/entities/user.entity';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { ExternalServicesHealthIndicator } from './indicators/external-services.health';

@Module({
  imports: [TerminusModule, TypeOrmModule.forFeature([User]), HttpModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    ExternalServicesHealthIndicator,
  ],
})
export class HealthModule {}
