import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CourseAnalyticsService } from '../services/course-analytics.service';
import { AnalyticsQueryDto } from '../dto/course-analytics.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/role/roles.decorator';
import { RolesGuard } from 'src/role/roles.guard';
import { Role } from 'src/role/roles.enum';

@Controller('courses/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Instructor, Role.Admin)
export class CourseAnalyticsController {
  constructor(private readonly analyticsService: CourseAnalyticsService) {}

  @Get('dashboard')
  getInstructorDashboard(@Request() req) {
    return this.analyticsService.getInstructorDashboard(req.user.id);
  }

  @Get(':courseId')
  getCourseAnalytics(@Param('courseId') courseId: string, @Query() queryDto: AnalyticsQueryDto) {
    return this.analyticsService.getCourseAnalytics(courseId, queryDto);
  }

  @Get(':courseId/performance')
  getCoursePerformance(@Param('courseId') courseId: string) {
    return this.analyticsService.getCoursePerformance(courseId);
  }
}
