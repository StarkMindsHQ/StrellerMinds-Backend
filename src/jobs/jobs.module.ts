import { Module, Global } from '@nestjs/common';
import { JobManager } from './JobManager';
import { QueueProcessor } from './QueueProcessor';
import { FailureHandler } from './FailureHandler';

@Global()
@Module({
  providers: [
    JobManager,
    QueueProcessor,
    FailureHandler,
  ],
  exports: [
    JobManager,
  ],
})
export class JobsModule {}
