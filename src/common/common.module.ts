import { Module } from '@nestjs/common';

import { TransactionManager } from './services/transaction.service';

@Module({
  providers: [TransactionManager],
  exports: [TransactionManager],
})
export class CommonModule {}
