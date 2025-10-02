/**
 * CredentialController handles endpoints for credential management and history.
 */
import {
  Controller,
  Get,
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
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
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
}
