// src/verification/dto/verify-credential.dto.ts
import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyCredentialDto {
  @ApiProperty({ example: '0xabc123...', description: 'Credential hash, token, or signature' })
  @IsString()
  credentialHash: string;

  @ApiProperty({
    example: 'eth_signature',
    enum: ['eth_signature', 'jwt', 'ipfs_proof'],
    description: 'Verification method to use',
  })
  @IsString()
  @IsIn(['eth_signature', 'jwt', 'ipfs_proof'])
  method: string;
}
