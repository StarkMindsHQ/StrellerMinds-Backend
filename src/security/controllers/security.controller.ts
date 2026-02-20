import { Controller, Get, Post, Body, Headers, Ip, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SecurityService } from '../services/security-validation.service';

@ApiTags('Security')
@Controller('security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

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
