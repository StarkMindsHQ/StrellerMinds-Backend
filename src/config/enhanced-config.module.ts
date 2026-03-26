import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigEncryptionService } from './config-encryption.service';
import { ConfigAuditService } from './config-audit.service';
import { ConfigVersioningService } from './config-versioning.service';
import { EnhancedConfigService } from './enhanced-config.service';
import { getValidationSchema } from './enhanced-validation.schema';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env.local',
        '.env',
      ],
      validationSchema: getValidationSchema(process.env.NODE_ENV || 'development'),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
  providers: [
    ConfigEncryptionService,
    ConfigAuditService,
    ConfigVersioningService,
    EnhancedConfigService,
  ],
  exports: [
    ConfigEncryptionService,
    ConfigAuditService,
    ConfigVersioningService,
    EnhancedConfigService,
  ],
})
export class ConfigModule {}
