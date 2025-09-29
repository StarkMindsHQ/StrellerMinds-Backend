// src/verification/verification.module.ts
import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { EthSignatureStrategy } from './strategies/eth-signature.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { IpfsProofStrategy } from './strategies/ipfs-proof.strategy';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    EthSignatureStrategy,
    JwtStrategy,
    IpfsProofStrategy,
  ],
})
export class VerificationModule {}