import { Global, Module } from '@nestjs/common';
import { DebounceGuard } from './debounce.guard';

@Global()
@Module({
  providers: [DebounceGuard],
  exports: [DebounceGuard],
})
export class DebounceModule {}
