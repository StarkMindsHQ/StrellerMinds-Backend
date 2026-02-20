import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles } from '../guards/auth.guard';
import { UserRole } from '../entities/user.entity';
import { SecurityAuditService } from '../services/security-audit.service';

@ApiTags('Security')
@Controller('security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class SecurityController {
  constructor(private readonly securityAuditService: SecurityAuditService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get security dashboard stats' })
  @ApiResponse({ status: 200, description: 'Security stats retrieved successfully' })
  async getDashboardStats() {
    // In a real app, this would aggregate data from DB
    // For now, returning mock/simple data or recent events
    return {
      recentEvents: await this.securityAuditService.getRecentEvents(null, 20), // Pass null to get all users? Need to update service
      // Add more stats here
    };
  }
}
