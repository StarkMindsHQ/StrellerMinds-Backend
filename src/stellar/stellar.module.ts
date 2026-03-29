import { Module, Global } from '@nestjs/common';
import { StellarConnectionPool } from './StellarConnectionPool';
import { TransactionBatcher } from './TransactionBatcher';
import { NetworkMonitor } from './NetworkMonitor';
import { StellarOptimizationService } from '../services/StellarOptimizationService';

@Global()
@Module({
  providers: [
    StellarConnectionPool,
    TransactionBatcher,
    NetworkMonitor,
    StellarOptimizationService,
  ],
  exports: [
    StellarConnectionPool,
    TransactionBatcher,
    NetworkMonitor,
    StellarOptimizationService,
  ],
})
export class StellarModule {}
