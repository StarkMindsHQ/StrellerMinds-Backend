import { Module } from '@nestjs/common';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';

@Module({
  controllers: [BlockchainController],
  providers: [BlockchainService]
})
export class BlockchainModule {}
