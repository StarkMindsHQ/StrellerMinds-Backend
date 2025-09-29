import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from './logger.service';
import { WinstonConfigService } from './winston.config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    LoggerService,
    WinstonConfigService,
    {
      provide: 'WINSTON_LOGGER',
      useFactory: (configService) => {
        const winstonConfig = new WinstonConfigService(configService);
        return winstonConfig.createWinstonLogger();
      },
      inject: [ConfigModule],
    },
  ],
  exports: [LoggerService, 'WINSTON_LOGGER'],
})
export class LoggingModule {}
