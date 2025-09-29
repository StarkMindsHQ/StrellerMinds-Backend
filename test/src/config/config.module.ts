import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigurationService } from './config-service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  providers: [ConfigurationService],
  exports: [ConfigurationService],
})
export class ConfigurationModule {}
