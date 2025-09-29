import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Wallet, WalletType } from '../entities/wallet.entity';
import { Credential } from '../entities/credential.entity';
import { ConnectWalletDto } from '../dto/connect-wallet.dto';
import { ShareCredentialDto } from '../dto/share-credential.dto';
import { CredentialFilterDto } from '../dto/credential-filter.dto';
import { EthereumWalletProvider } from '../providers/ethereum-wallet.provider';
import { WalletConnectionResult, CredentialShareResult } from '../interfaces/wallet-service.interface';
import * as crypto from 'crypto';

/**
 * Service for blockchain wallet integration, authentication, and credential management.
 * Handles wallet connection, credential sharing, and related business logic.
 */
@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Credential)
    private credentialRepository: Repository<Credential>,
    private jwtService: JwtService,
    private ethereumProvider: EthereumWalletProvider,
  ) {}

  /**
   * Connect a wallet and authenticate the user.
   * @param connectWalletDto Wallet connection details
   * @returns Wallet connection result
   * @throws UnauthorizedException if signature is invalid
   */
  async connectWallet(connectWalletDto: ConnectWalletDto): Promise<WalletConnectionResult> {
    const { address, type, signature, message, ensName } = connectWalletDto;

    // Verify signature
    const isValidSignature = await this.ethereumProvider.verifySignature(
      address,
      message,
      signature
    );

    if (!isValidSignature) {
      throw new UnauthorizedException('Invalid wallet signature');
    }

    // Check if wallet already exists
    let wallet = await this.walletRepository.findOne({
      where: { address: address.toLowerCase() }
    });

    let isNewWallet = false;
    if (!wallet) {
      // Create new wallet
      wallet = this.walletRepository.create({
        address: address.toLowerCase(),
        type,
        ensName,
        isActive: true,
        lastConnectedAt: new Date(),
      });
      isNewWallet = true;
    } else {
      // Update existing wallet
      wallet.lastConnectedAt = new Date();
      wallet.isActive = true;
      if (ensName) wallet.ensName = ensName;
    }

    await this.walletRepository.save(wallet);

    // Generate JWT token
    const payload = { walletId: wallet.id, address: wallet.address };
    const accessToken = this.jwtService.sign(payload);

    return {
      wallet: {
        id: wallet.id,
        address: wallet.address,
        type: wallet.type,
        ensName: wallet.ensName,
        isActive: wallet.isActive,
        lastConnectedAt: wallet.lastConnectedAt,
      },
      accessToken,
      isNewWallet,
    };
  }

  /**
   * Disconnect a wallet by ID.
   * @param walletId Wallet ID
   */
  async disconnectWallet(walletId: string): Promise<void> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId }
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    wallet.isActive = false;
    await this.walletRepository.save(wallet);
  }

  /**
   * Get credentials for a wallet with optional filters.
   * @param walletId Wallet ID
   * @param filters Credential filter options
   * @returns List of credentials
   */
  async getWalletCredentials(
    walletId: string,
    filters: CredentialFilterDto
  ): Promise<Credential[]> {
    const queryBuilder = this.credentialRepository
      .createQueryBuilder('credential')
      .where('credential.walletId = :walletId', { walletId });

    if (filters.type) {
      queryBuilder.andWhere('credential.type = :type', { type: filters.type });
    }

    if (filters.status) {
      queryBuilder.andWhere('credential.status = :status', { status: filters.status });
    }

    if (filters.issuer) {
      queryBuilder.andWhere('credential.issuer ILIKE :issuer', { 
        issuer: `%${filters.issuer}%` 
      });
    }

    if (filters.isShared !== undefined) {
      queryBuilder.andWhere('credential.isShared = :isShared', { 
        isShared: filters.isShared 
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(credential.subject ILIKE :search OR credential.issuer ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    queryBuilder.orderBy('credential.createdAt', 'DESC');

    return await queryBuilder.getMany();
  }

  /**
   * Get a specific credential by ID for a wallet.
   * @param credentialId Credential ID
   * @param walletId Wallet ID
   * @returns Credential entity
   * @throws NotFoundException if not found
   */
  async getCredentialById(credentialId: string, walletId: string): Promise<Credential> {
    const credential = await this.credentialRepository.findOne({
      where: { id: credentialId, walletId },
      relations: ['wallet']
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    return credential;
  }

  /**
   * Share credentials from a wallet.
   * @param walletId Wallet ID
   * @param shareDto Credential sharing details
   * @returns Sharing result
   */
  async shareCredentials(
    walletId: string,
    shareDto: ShareCredentialDto
  ): Promise<CredentialShareResult> {
    const { credentialIds, recipientAddress, message, expirationDate } = shareDto;

    // Validate credentials belong to wallet
    const credentials = await this.credentialRepository.find({
      where: { 
        id: credentialIds as any, // TypeORM In operator
        walletId 
      }
    });

    if (credentials.length !== credentialIds.length) {
      throw new BadRequestException('Some credentials not found or not owned by wallet');
    }

    const sharedCredentials: string[] = [];
    const errors: string[] = [];

    for (const credential of credentials) {
      try {
        // Generate sharing hash
        const shareHash = this.generateShareHash(credential.id, recipientAddress);
        
        // Update credential
        credential.isShared = true;
        credential.sharedWith = recipientAddress;
        
        // In a real implementation, you would create a blockchain transaction here
        // For now, we'll simulate with a mock transaction hash
        credential.transactionHash = `0x${crypto.randomBytes(32).toString('hex')}`;
        
        await this.credentialRepository.save(credential);
        sharedCredentials.push(credential.id);
      } catch (error) {
        errors.push(`Failed to share credential ${credential.id}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      sharedCredentials,
      errors: errors.length > 0 ? errors : undefined,
      transactionHash: credentials[0]?.transactionHash, // Return first transaction hash
    };
  }

  /**
   * Revoke a shared credential by ID for a wallet.
   * @param credentialId Credential ID
   * @param walletId Wallet ID
   */
  async revokeCredentialShare(credentialId: string, walletId: string): Promise<void> {
    const credential = await this.getCredentialById(credentialId, walletId);
    
    if (!credential.isShared) {
      throw new BadRequestException('Credential is not currently shared');
    }

    credential.isShared = false;
    credential.sharedWith = null;
    await this.credentialRepository.save(credential);
  }

  /**
   * Get wallet statistics for a wallet.
   * @param walletId Wallet ID
   * @returns Wallet stats
   */
  async getWalletStats(walletId: string): Promise<any> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
      relations: ['credentials']
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const stats = await this.credentialRepository
      .createQueryBuilder('credential')
      .select([
        'credential.type',
        'credential.status',
        'COUNT(*) as count'
      ])
      .where('credential.walletId = :walletId', { walletId })
      .groupBy('credential.type, credential.status')
      .getRawMany();

    return {
      wallet: {
        id: wallet.id,
        address: wallet.address,
        type: wallet.type,
        ensName: wallet.ensName,
      },
      totalCredentials: wallet.credentials.length,
      credentialsByType: this.groupStats(stats, 'type'),
      credentialsByStatus: this.groupStats(stats, 'status'),
      sharedCredentials: wallet.credentials.filter(c => c.isShared).length,
    };
  }

  private generateShareHash(credentialId: string, recipientAddress: string): string {
    return crypto
      .createHash('sha256')
      .update(`${credentialId}:${recipientAddress}:${Date.now()}`)
      .digest('hex');
  }

  private groupStats(stats: any[], groupBy: string): any {
    return stats.reduce((acc, stat) => {
      const key = stat[`credential_${groupBy}`];
      if (!acc[key]) acc[key] = 0;
      acc[key] += parseInt(stat.count);
      return acc;
    }, {});
  }
}
