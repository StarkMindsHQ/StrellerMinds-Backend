// src/verification/verification.service.ts
import { Injectable } from '@nestjs/common';
import { VerifyCredentialDto } from './dto/verify-credential.dto';
import { EthSignatureStrategy } from './strategies/eth-signature.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { IpfsProofStrategy } from './strategies/ipfs-proof.strategy';

@Injectable()
export class VerificationService {
  constructor(
    private ethStrategy: EthSignatureStrategy,
    private jwtStrategy: JwtStrategy,
    private ipfsStrategy: IpfsProofStrategy,
  ) {}

  async verify(dto: VerifyCredentialDto): Promise<any> {
    switch (dto.method) {
      case 'eth_signature':
        return this.ethStrategy.verify(dto.credentialHash);
      case 'jwt':
        return this.jwtStrategy.verify(dto.credentialHash);
      case 'ipfs_proof':
        return this.ipfsStrategy.verify(dto.credentialHash);
      default:
        throw new Error('Unsupported verification method');
    }
  }
}
