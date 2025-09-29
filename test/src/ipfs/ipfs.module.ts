import { Module } from '@nestjs/common';
import { IpfsService } from './ipfs.service';
import { IpfsController } from './ipfs.controller';
import { ApiTags } from '@nestjs/swagger';

/**
 * IPFS Module for decentralized file storage and retrieval.
 * Provides controller and service for IPFS operations.
 */
@Module({
  controllers: [IpfsController],
  providers: [IpfsService],
})
export class IpfsModule {}
