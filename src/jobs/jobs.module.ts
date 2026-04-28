import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailProcessor, EMAIL_QUEUE } from './email.processor';
import { FileProcessor, FILE_QUEUE } from './file.processor';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue({ name: EMAIL_QUEUE }, { name: FILE_QUEUE }),
  ],
  providers: [EmailProcessor, FileProcessor, JobsService],
  exports: [JobsService],
})
export class JobsModule {}
