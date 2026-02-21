import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { ReportGenerationService } from '../services/report-generation.service';
import { CreateScheduleDto, UpdateScheduleDto } from '../dto/schedule.dto';

@ApiTags('Report Schedules')
@Controller('analytics/schedules')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ScheduleController {
  constructor(private readonly reportGenerationService: ReportGenerationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new report schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created successfully' })
  async createSchedule(@Request() req, @Body() createScheduleDto: CreateScheduleDto) {
    const schedule = await this.reportGenerationService.createSchedule(
      req.user.id,
      createScheduleDto,
    );
    return {
      success: true,
      data: schedule,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all schedules' })
  @ApiResponse({ status: 200, description: 'Schedules retrieved successfully' })
  async listSchedules(@Request() req) {
    const schedules = await this.reportGenerationService.listSchedules(req.user.id);
    return {
      success: true,
      data: schedules,
    };
  }

  @Put(':scheduleId')
  @ApiOperation({ summary: 'Update a schedule' })
  @ApiResponse({ status: 200, description: 'Schedule updated successfully' })
  async updateSchedule(
    @Request() req,
    @Param('scheduleId') scheduleId: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    const schedule = await this.reportGenerationService.updateSchedule(
      scheduleId,
      req.user.id,
      updateScheduleDto,
    );
    return {
      success: true,
      data: schedule,
    };
  }

  @Delete(':scheduleId')
  @ApiOperation({ summary: 'Delete a schedule' })
  @ApiResponse({ status: 200, description: 'Schedule deleted successfully' })
  @HttpCode(HttpStatus.OK)
  async deleteSchedule(@Request() req, @Param('scheduleId') scheduleId: string) {
    await this.reportGenerationService.deleteSchedule(scheduleId, req.user.id);
    return {
      success: true,
      message: 'Schedule deleted successfully',
    };
  }
}
