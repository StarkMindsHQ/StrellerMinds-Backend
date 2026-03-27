import { Controller, Get, Post, Body, Headers, Ip, Req, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SecurityService } from '../services/security-validation.service';
import { RateLimitService } from '../services/rate-limit.service';
import { JwtAuthGuard, Roles } from '../../auth/guards/auth.guard';
import { UserRole } from '../../auth/entities/user.entity';

@ApiTags('Security')
@Controller('security')
export class SecurityController {
  constructor(
    private readonly securityService: SecurityService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Get('csrf-token')
  @ApiOperation({ summary: 'Get CSRF token' })
  @ApiResponse({ status: 200, description: 'CSRF token generated successfully' })
  getCsrfToken(@Headers() headers: any) {
    return this.securityService.generateCsrfToken(headers);
  }

  @Post('validate-request')
  @ApiOperation({ summary: 'Validate request security' })
  @ApiResponse({ status: 200, description: 'Request validated successfully' })
  validateRequest(@Body() body: any, @Headers() headers: any, @Ip() ip: string, @Req() req: any) {
    return this.securityService.validateRequest(body, headers, ip, req);
  }

  @Get('security-headers')
  @ApiOperation({ summary: 'Get security headers info' })
  @ApiResponse({ status: 200, description: 'Security headers information' })
  getSecurityHeaders() {
    return this.securityService.getSecurityHeaders();
  }

  @Get('rate-limit-stats')
  @ApiOperation({ summary: 'Get rate limit stats for calling IP' })
  @ApiResponse({ status: 200, description: 'Rate limit stats' })
  getRateLimitStats(@Ip() ip: string) {
    return this.rateLimitService.getIpStats(ip);
  }

  @Get('analytics/violations')
  @UseGuards(JwtAuthGuard, Roles)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent rate limit violations (Admin only)' })
  async getViolations(@Query('limit') limit?: number) {
    return this.rateLimitService.getAnalytics(limit);
  }

  @Post('ip-block')
  @UseGuards(JwtAuthGuard, Roles)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually block an IP' })
  async blockIp(@Body() data: { ip: string; duration: number }) {
    return this.rateLimitService.blockIp(data.ip, data.duration);
  }

  @Post('ip-unblock')
  @UseGuards(JwtAuthGuard, Roles)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually unblock an IP' })
  async unblockIp(@Body() data: { ip: string }) {
    return this.rateLimitService.unblockIp(data.ip);
  }

  @Get('rate-limit-info')
  @ApiOperation({ summary: 'Get rate limit information' })
  @ApiResponse({ status: 200, description: 'Rate limit information' })
  getRateLimitInfo(@Ip() ip: string) {
    return this.securityService.getRateLimitInfo(ip);
  }

  @Post('report-suspicious-activity')
  @ApiOperation({ summary: 'Report suspicious activity' })
  @ApiResponse({ status: 200, description: 'Activity reported successfully' })
  reportSuspiciousActivity(
    @Body() reportData: { type: string; description: string; evidence?: any },
  ) {
    return this.securityService.reportSuspiciousActivity(reportData);
  }
}
