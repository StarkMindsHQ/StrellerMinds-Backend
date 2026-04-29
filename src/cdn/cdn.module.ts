import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CdnService } from './cdn.service';

@Module({
  imports: [ConfigModule],
  providers: [CdnService],
  exports: [CdnService],
})
export class CdnModule {}
