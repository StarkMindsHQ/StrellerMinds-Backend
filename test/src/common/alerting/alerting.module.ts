import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AlertingService } from './alerting.service';
import { LoggingModule } from '../logging/logging.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    LoggingModule,
  ],
  providers: [AlertingService],
  exports: [AlertingService],
})
export class AlertingModule {}
