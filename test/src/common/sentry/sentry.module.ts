import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SentryConfigService } from './sentry.config';
import { SentryService } from './sentry.service';
import { LoggingModule } from '../logging/logging.module';

@Global()
@Module({
  imports: [ConfigModule, LoggingModule],
  providers: [
    SentryConfigService,
    SentryService,
    {
      provide: 'SENTRY_INIT',
      useFactory: (sentryConfig: SentryConfigService) => {
        sentryConfig.initializeSentry();
        return true;
      },
      inject: [SentryConfigService],
    },
  ],
  exports: [SentryService, SentryConfigService],
})
export class SentryModule {}
