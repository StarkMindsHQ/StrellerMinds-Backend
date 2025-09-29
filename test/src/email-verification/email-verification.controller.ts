/**
 * EmailVerificationController handles endpoints for sending, verifying, and resending email verification.
 */
import { 
    Controller, 
    Post, 
    Body, 
    Get, 
    Query, 
    HttpStatus, 
    HttpCode,
    UseGuards,
    Req
  } from '@nestjs/common';
  import { 
    ApiTags, 
    ApiOperation, 
    ApiResponse, 
    ApiQuery,
    ApiBearerAuth 
  } from '@nestjs/swagger';
  import { EmailVerificationService } from './email-verification.service';
  import { 
    SendVerificationEmailDto, 
    ResendVerificationDto 
  } from './dto/email-verification.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
  
  @ApiTags('Email Verification')
  @Controller('auth/email-verification')
  export class EmailVerificationController {
    constructor(
      private readonly emailVerificationService: EmailVerificationService,
    ) {}
  
    /**
     * Send a verification email to the user.
     * @param dto - DTO containing the user's email
     * @returns Success message
     */
    @Post('send')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send verification email' })
    @ApiResponse({ 
      status: 200, 
      description: 'Verification email sent successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        }
      }
    })
    @ApiResponse({ status: 400, description: 'Bad request - Email already verified' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async sendVerificationEmail(@Body() dto: SendVerificationEmailDto) {
      return await this.emailVerificationService.sendVerificationEmail(dto.email);
    }
  
    /**
     * Verify email using a verification token.
     * @param token - Verification token
     * @returns Success message
     */
    @Get('verify')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify email using token' })
    @ApiQuery({ name: 'token', description: 'Verification token' })
    @ApiResponse({ 
      status: 200, 
      description: 'Email verified successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              isEmailVerified: { type: 'boolean' }
            }
          }
        }
      }
    })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    async verifyEmail(@Query('token') token: string) {
      return await this.emailVerificationService.verifyEmail(token);
    }
  
    /**
     * Resend a verification email to the user.
     * @param dto - DTO containing the user's email
     * @returns Success message
     */
    @Post('resend')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Resend verification email' })
    @ApiResponse({ 
      status: 200, 
      description: 'Verification email resent successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        }
      }
    })
    @ApiResponse({ status: 400, description: 'Bad request - Rate limit or already verified' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async resendVerificationEmail(@Body() dto: ResendVerificationDto) {
      return await this.emailVerificationService.resendVerificationEmail(dto.email);
    }
  
    @Get('status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Check email verification status' })
    @ApiResponse({ 
      status: 200, 
      description: 'Email verification status',
      schema: {
        type: 'object',
        properties: {
          isEmailVerified: { type: 'boolean' }
        }
      }
    })
    async getVerificationStatus(@Req() req: any) {
      const isVerified = await this.emailVerificationService.isEmailVerified(req.user.id);
      return { isEmailVerified: isVerified };
    }
  }
