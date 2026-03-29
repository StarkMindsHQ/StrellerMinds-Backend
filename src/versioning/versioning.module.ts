import { Module, Global } from '@nestjs/common';
import { VersionManager } from './VersionManager';
import { DeprecationHandler } from './DeprecationHandler';
import { MigrationAssistant } from './MigrationAssistant';

@Global()
@Module({
  providers: [
    VersionManager,
    DeprecationHandler,
    MigrationAssistant,
  ],
  exports: [
    VersionManager,
    DeprecationHandler,
    MigrationAssistant,
  ],
})
export class VersioningModule {}
