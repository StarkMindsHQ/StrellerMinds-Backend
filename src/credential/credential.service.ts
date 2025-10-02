import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindManyOptions } from 'typeorm';
import { Credential } from './entities/credential.entity';
import { CredentialHistoryQueryDto, CredentialStatus } from './dto/credential-history-query.dto';
import { CredentialHistoryResponseDto, CredentialDto } from './dto/credential-history-response.dto';
import { StellarService } from '../blockchain/stellar/stellar.service';

/**
 * CredentialService provides logic for credential management and history retrieval.
 */
@Injectable()
export class CredentialService {
  constructor(
    @InjectRepository(Credential)
    private credentialRepository: Repository<Credential>,
    private readonly stellarService: StellarService,
  ) {}

  /**
   * Get user credential history.
   *
   * @param userId - The ID of the user whose credential history is to be retrieved.
   * @param queryParams - The query parameters for retrieving credential history, including pagination and filters.
   * @returns A promise that resolves to the user's credential history response DTO.
   */
  async getUserCredentialHistory(
    userId: string,
    queryParams: CredentialHistoryQueryDto,
  ): Promise<CredentialHistoryResponseDto> {
    const { page = 1, limit = 10, credentialType, startDate, endDate, status } = queryParams;

    // Build query conditions
    const findOptions: FindManyOptions<Credential> = {
      where: { userId },
      order: { issuedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    };

    // Add filters if provided
    if (credentialType) {
      findOptions.where = { ...findOptions.where, type: credentialType };
    }

    if (startDate && endDate) {
      findOptions.where = {
        ...findOptions.where,
        issuedAt: Between(startDate, endDate),
      };
    }

    if (status && status !== CredentialStatus.ALL) {
      findOptions.where = { ...findOptions.where, status };
    }

    // Execute query with pagination
    const [credentials, totalItems] = await this.credentialRepository.findAndCount(findOptions);

    // Map to DTOs
    const mappedCredentials = credentials.map((credential) => this.mapToCredentialDto(credential));

    return {
      data: mappedCredentials,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  /**
   * Verify a user's credential by its ID.
   *
   * @param userId - The ID of the user who owns the credential.
   * @param credentialId - The ID of the credential to be verified.
   * @returns A promise that resolves to an object containing the verification result and the credential DTO.
   */
  async verifyCredential(
    userId: string,
    credentialId: string,
  ): Promise<{ verified: boolean; credential: CredentialDto }> {
    // Find the credential
    const credential = await this.credentialRepository.findOne({
      where: { id: credentialId, userId },
    });

    if (!credential) {
      throw new HttpException('Credential not found', HttpStatus.NOT_FOUND);
    }

    // Verify on the blockchain using Stellar SDK
    let verified = false;
    try {
      if (credential.network?.toLowerCase() !== 'stellar') {
        // Currently only Stellar network is supported for on-chain verification
        verified = false;
      } else if (credential.txHash) {
        const tx = await this.stellarService.monitorTransaction(credential.txHash);
        if (tx) {
          // If blockHeight is stored, ensure it matches the ledger sequence
          if (credential.blockHeight && typeof tx.ledger === 'number') {
            verified = Number(credential.blockHeight) === Number(tx.ledger);
          } else {
            verified = true;
          }
        }
      }
    } catch (err) {
      verified = false;
    }

    // Update verification status in database
    credential.verificationStatus = verified;
    await this.credentialRepository.save(credential);

    return {
      verified,
      credential: this.mapToCredentialDto(credential),
    };
  }

  /**
   * Maps a Credential entity to a CredentialDto.
   * @param credential - The Credential entity instance.
   * @returns The mapped CredentialDto.
   */
  private mapToCredentialDto(credential: Credential): CredentialDto {
    return {
      id: credential.id,
      type: credential.type,
      name: credential.name,
      issuedAt: credential.issuedAt,
      expiresAt: credential.expiresAt,
      issuer: {
        id: credential.issuerId,
        name: credential.issuerName,
      },
      status: credential.status,
      verificationStatus: credential.verificationStatus,
      metadata: credential.metadata,
      blockchainReference: {
        txHash: credential.txHash,
        network: credential.network,
        timestamp: credential.issuedAt,
        blockHeight: credential.blockHeight,
      },
    };
  }
}
