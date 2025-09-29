import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO representing a blockchain reference for a credential.
 */
export class BlockchainReferenceDto {
  /** Blockchain transaction hash */
  @ApiProperty({ description: 'Blockchain transaction hash', example: '0x123...' })
  txHash: string;

  /** Blockchain network name */
  @ApiProperty({ description: 'Blockchain network name', example: 'stellar' })
  network: string;

  /** Timestamp of the transaction */
  @ApiProperty({ description: 'Transaction timestamp', type: String, format: 'date-time', example: '2025-06-29T12:00:00Z' })
  timestamp: Date;

  /** Block height of the transaction */
  @ApiProperty({ description: 'Block height', example: 123456 })
  blockHeight: number;
}

/**
 * DTO representing a credential in the history response.
 */
export class CredentialDto {
  @ApiProperty({ description: 'Credential ID', example: 'uuid-v4' })
  id: string;

  @ApiProperty({ description: 'Credential type', example: 'course-completion' })
  type: string;

  @ApiProperty({ description: 'Credential name', example: 'Blockchain Basics Certificate' })
  name: string;

  @ApiProperty({ description: 'Date issued', type: String, format: 'date-time', example: '2025-06-29T12:00:00Z' })
  issuedAt: Date;

  @ApiPropertyOptional({ description: 'Date expires', type: String, format: 'date-time', example: '2026-06-29T12:00:00Z' })
  expiresAt?: Date;

  @ApiProperty({ description: 'Issuer details' })
  issuer: {
    id: string;
    name: string;
  };

  @ApiProperty({ description: 'Credential status', example: 'active' })
  status: string;

  @ApiProperty({ description: 'Credential verification status', example: true })
  verificationStatus: boolean;

  @ApiProperty({ description: 'Credential metadata', type: 'object', example: { score: 95 } })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Blockchain reference' })
  blockchainReference: BlockchainReferenceDto;
}

/**
 * DTO for paginated credential history response.
 */
export class CredentialHistoryResponseDto {
  @ApiProperty({ type: [CredentialDto], description: 'List of credentials' })
  data: CredentialDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 10,
      totalItems: 100,
      totalPages: 10,
    },
  })
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
