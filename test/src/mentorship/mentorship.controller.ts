import { Controller, Post, Body, Param, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { MentorshipService } from './mentorship.service';

/**
 * Controller for mentorship operations: matching, creation, tracking, sessions, and analytics.
 */
@ApiTags('Mentorship')
@Controller('mentorship')
export class MentorshipController {
  constructor(private readonly mentorshipService: MentorshipService) {}

  /**
   * Match a mentee to potential mentors based on criteria.
   */
  @Post('match')
  @ApiOperation({ summary: 'Match mentee to mentors', description: 'Finds mentors for a mentee based on criteria.' })
  @ApiBody({ schema: { properties: { menteeId: { type: 'string' }, criteria: { type: 'object' } } } })
  @ApiResponse({ status: 200, description: 'List of matched mentors.' })
  async matchMentor(@Body() body: { menteeId: string; criteria: any }) {
    return this.mentorshipService.matchMentorMentee(body.menteeId, body.criteria);
  }

  /**
   * Create a new mentorship relationship.
   */
  @Post()
  @ApiOperation({ summary: 'Create mentorship', description: 'Creates a new mentorship between mentor and mentee.' })
  @ApiBody({ schema: { properties: { mentorId: { type: 'string' }, menteeId: { type: 'string' }, goals: { type: 'string', required: false } } } })
  @ApiResponse({ status: 201, description: 'Mentorship created.' })
  async createMentorship(@Body() body: { mentorId: string; menteeId: string; goals?: string }) {
    return this.mentorshipService.createMentorship(body.mentorId, body.menteeId, body.goals);
  }

  /**
   * Track a mentorship by ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Track mentorship', description: 'Get mentorship details by ID.' })
  @ApiParam({ name: 'id', description: 'Mentorship ID' })
  @ApiResponse({ status: 200, description: 'Mentorship details.' })
  async trackMentorship(@Param('id') id: string) {
    return this.mentorshipService.trackMentorship(id);
  }

  /**
   * Create a session for a mentorship.
   */
  @Post(':id/session')
  @ApiOperation({ summary: 'Create mentorship session', description: 'Schedules a new session for a mentorship.' })
  @ApiParam({ name: 'id', description: 'Mentorship ID' })
  @ApiBody({ schema: { properties: { scheduledAt: { type: 'string', format: 'date-time' }, durationMinutes: { type: 'number', required: false }, notes: { type: 'string', required: false } } } })
  @ApiResponse({ status: 201, description: 'Session created.' })
  async createSession(@Param('id') mentorshipId: string, @Body() body: { scheduledAt: Date; durationMinutes?: number; notes?: string }) {
    return this.mentorshipService.createSession(mentorshipId, body.scheduledAt, body.durationMinutes, body.notes);
  }

  /**
   * Get mentorship analytics summary.
   */
  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get mentorship analytics', description: 'Returns analytics summary for mentorships.' })
  @ApiResponse({ status: 200, description: 'Analytics summary.' })
  async getAnalytics() {
    return this.mentorshipService.getMentorshipAnalytics();
  }
}
