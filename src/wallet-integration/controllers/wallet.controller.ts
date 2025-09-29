import {
    Controller,
    Post,
    Get,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpStatus,
    HttpCode,
  } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WalletService } from '../services/wallet.service';
import { ConnectWalletDto } from '../dto/connect-wallet.dto';
import { ShareCredentialDto } from '../dto/share-credential.dto';
import { CredentialFilterDto } from '../dto/credential-filter.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

/**
 * Controller for wallet-related operations (connect, disconnect, credentials, sharing, stats).
 */
@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Connect a wallet and authenticate the user.
   * @param connectWalletDto - Wallet connection details
   * @returns Wallet connection result
   */
  @Post('connect')
  @ApiOperation({ summary: 'Connect a wallet and authenticate the user' })
  @ApiResponse({ status: 200, description: 'Wallet connected successfully.' })
  @HttpCode(HttpStatus.OK)
  async connectWallet(@Body() connectWalletDto: ConnectWalletDto) {
    return await this.walletService.connectWallet(connectWalletDto);
  }

  /**
   * Disconnect the authenticated user's wallet.
   */
  @Post('disconnect')
  @ApiOperation({ summary: 'Disconnect the authenticated user\'s wallet' })
  @ApiResponse({ status: 204, description: 'Wallet disconnected successfully.' })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnectWallet(@Request() req) {
    await this.walletService.disconnectWallet(req.user.walletId);
  }

  /**
   * Get credentials for the authenticated user's wallet.
   * @param filters - Credential filter options
   * @returns List of credentials
   */
  @Get('credentials')
  @ApiOperation({ summary: 'Get credentials for the authenticated user\'s wallet' })
  @ApiResponse({ status: 200, description: 'List of credentials.' })
  @UseGuards(JwtAuthGuard)
  async getCredentials(
    @Request() req,
    @Query() filters: CredentialFilterDto
  ) {
    return await this.walletService.getWalletCredentials(req.user.walletId, filters);
  }

  /**
   * Get a specific credential by ID for the authenticated user's wallet.
   * @param credentialId - Credential ID
   * @returns Credential details
   */
  @Get('credentials/:id')
  @ApiOperation({ summary: 'Get a specific credential by ID' })
  @ApiResponse({ status: 200, description: 'Credential details.' })
  @UseGuards(JwtAuthGuard)
  async getCredential(@Request() req, @Param('id') credentialId: string) {
    return await this.walletService.getCredentialById(credentialId, req.user.walletId);
  }

  /**
   * Share credentials from the authenticated user's wallet.
   * @param shareDto - Credential sharing details
   * @returns Sharing result
   */
  @Post('credentials/share')
  @ApiOperation({ summary: 'Share credentials from the authenticated user\'s wallet' })
  @ApiResponse({ status: 201, description: 'Credentials shared successfully.' })
  @UseGuards(JwtAuthGuard)
  async shareCredentials(
    @Request() req,
    @Body() shareDto: ShareCredentialDto
  ) {
    return await this.walletService.shareCredentials(req.user.walletId, shareDto);
  }

  /**
   * Revoke a shared credential by ID for the authenticated user's wallet.
   * @param credentialId - Credential ID
   */
  @Delete('credentials/:id/share')
  @ApiOperation({ summary: 'Revoke a shared credential by ID' })
  @ApiResponse({ status: 204, description: 'Credential share revoked.' })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeCredentialShare(
    @Request() req,
    @Param('id') credentialId: string
  ) {
    await this.walletService.revokeCredentialShare(credentialId, req.user.walletId);
  }

  /**
   * Get wallet statistics for the authenticated user.
   * @returns Wallet stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get wallet statistics for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Wallet statistics.' })
  @UseGuards(JwtAuthGuard)
  async getWalletStats(@Request() req) {
    return await this.walletService.getWalletStats(req.user.walletId);
  }
}
