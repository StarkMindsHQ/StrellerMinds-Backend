import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/role/roles.decorator';
import { RolesGuard } from 'src/role/roles.guard';
import { Role } from 'src/role/roles.enum';
import { UserDeletionService } from './services/users.deletion.service';

/**
 * Controller for handling user account deletion operations
 */
@ApiTags('users')
@Controller('users')
export class UserDeletionController {
  constructor(private readonly userDeletionService: UserDeletionService) {}

  /**
   * Deactivate a user account
   */
  @Post(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Student)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a user account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account has been deactivated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Unauthorized to deactivate this account',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async deactivateAccount(
    @Param('id', ParseUUIDPipe) userId: string,
    @Request() req,
  ): Promise<{ message: string }> {
    // Check if user is deactivating their own account or is an admin
    if (req.user.id !== userId && req.user.role !== Role.Admin) {
      return { message: 'You are not authorized to deactivate this account' };
    }

    await this.userDeletionService.deactivateAccount(userId, req.user.id);
    return { message: 'Account has been deactivated successfully' };
  }

  /**
   * Request account deletion (starts confirmation workflow)
   */
  @Post(':id/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Student)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request account deletion' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account deletion has been requested',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Unauthorized to delete this account',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async requestAccountDeletion(
    @Param('id', ParseUUIDPipe) userId: string,
    @Request() req,
  ): Promise<{ message: string }> {
    // Check if user is deleting their own account or is an admin
    if (req.user.id !== userId && req.user.role !== Role.Admin) {
      return { message: 'You are not authorized to delete this account' };
    }

    await this.userDeletionService.requestAccountDeletion(userId, req.user.id);
    return {
      message: 'Account deletion requested. Please check your email for confirmation instructions.',
    };
  }

  /**
   * Confirm account deletion with token
   */
  @Post(':id/confirm-deletion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm account deletion with token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account has been permanently deleted',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired confirmation token',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async confirmAccountDeletion(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() confirmDeletionDto: ConfirmDeletionDto,
  ): Promise<{ message: string }> {
    await this.userDeletionService.confirmAccountDeletion(userId, confirmDeletionDto.token);
    return { message: 'Account has been permanently deleted' };
  }

  /**
   * Admin-only endpoint to force delete an account
   */
  @Post(':id/force-delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Force delete a user account (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account has been forcefully deleted',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Unauthorized access',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async forceDeleteAccount(
    @Param('id', ParseUUIDPipe) userId: string,
    @Request() req,
  ): Promise<{ message: string }> {
    await this.userDeletionService.performAccountDeletion(userId, req.user.id);
    return { message: 'Account has been forcefully deleted by admin' };
  }
}
