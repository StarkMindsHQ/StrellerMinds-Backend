/**
 * CredentialController handles endpoints for credential management and history.
 */
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { CredentialService } from './credential.service';
import { CredentialHistoryQueryDto } from './dto/credential-history-query.dto';
import { CredentialHistoryResponseDto } from './dto/credential-history-response.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

/**
 * Custom decorator to extract the user object from the request.
 */
export const User = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});

@ApiTags('credentials')
@Controller('credentials')
export class CredentialController {
  constructor(private readonly credentialService: CredentialService) {}

  /**
   * Get user credential history from Stellar blockchain.
   *
   * Retrieves the credential history for the authenticated user, with optional filters and pagination.
   *
   * @param user - The user object, automatically injected
   * @param queryParams - The query parameters for credential history
   * @returns The credential history response DTO
   */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user credential history from Stellar blockchain',
    description:
      'Retrieves the credential history for the authenticated user, with optional filters and pagination.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Credential history retrieved successfully',
    type: CredentialHistoryResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'credentialType',
    required: false,
    description: 'Credential type filter',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for issued credentials (ISO8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for issued credentials (ISO8601)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Credential status filter',
  })
  async getCredentialHistory(
    @User() user: any,
    @Query() queryParams: CredentialHistoryQueryDto,
  ): Promise<CredentialHistoryResponseDto> {
    if (!user || !user.id) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    return this.credentialService.getUserCredentialHistory(user.id, queryParams);
  }

  /**
   * Verify a specific credential on the Stellar blockchain.
   *
   * Verifies a user's credential by validating the transaction on the Stellar network,
   * checking transaction existence, success, and metadata validation.
   *
   * @param user - The user object, automatically injected
   * @param credentialId - The ID of the credential to verify
   * @returns The verification result with credential details
   */
  @Post(':credentialId/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify credential on Stellar blockchain',
    description:
      "Verifies a user's credential by validating the transaction on the Stellar network, checking transaction existence, success, and metadata validation.",
  })
  @ApiParam({
    name: 'credentialId',
    description: 'The unique identifier of the credential to verify',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Credential verification completed successfully',
    schema: {
      type: 'object',
      properties: {
        verified: {
          type: 'boolean',
          description: 'Whether the credential is verified on the blockchain',
          example: true,
        },
        credential: {
          type: 'object',
          description: 'The verified credential details',
          properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            type: { type: 'string', example: 'course-completion' },
            name: { type: 'string', example: 'Blockchain Basics Certificate' },
            verificationStatus: { type: 'boolean', example: true },
            blockchainReference: {
              type: 'object',
              properties: {
                txHash: { type: 'string', example: 'abc123txhash' },
                network: { type: 'string', example: 'stellar' },
                blockHeight: { type: 'number', example: 12345 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Credential not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid credential ID or verification failed',
  })
  async verifyCredential(
    @User() user: any,
    @Param('credentialId') credentialId: string,
  ): Promise<{ verified: boolean; credential: any }> {
    if (!user || !user.id) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    if (!credentialId || credentialId.trim() === '') {
      throw new HttpException('Invalid credential ID provided', HttpStatus.BAD_REQUEST);
    }

    return this.credentialService.verifyCredential(user.id, credentialId);
  }
}
