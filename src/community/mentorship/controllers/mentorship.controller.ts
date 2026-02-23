import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { MentorshipService } from '../services/mentorship.service';
import {
  RegisterMentorDto,
  RequestMentorshipDto,
  LogSessionDto,
  SubmitFeedbackDto,
} from '../dto/mentorship.dto';

@ApiTags('Mentorship')
@Controller('community/mentorship')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MentorshipController {
  constructor(private readonly mentorshipService: MentorshipService) {}

  @Post('mentors')
  @ApiOperation({ summary: 'Register as a mentor' })
  async registerMentor(@Request() req, @Body() dto: RegisterMentorDto) {
    const profile = await this.mentorshipService.registerMentor(req.user.id, dto);
    return { success: true, data: profile };
  }

  @Get('mentors')
  @ApiOperation({ summary: 'Find mentors' })
  async findMentors(
    @Query('expertise') expertise?: string,
    @Query('available') available?: string,
  ) {
    const filters: any = {};
    if (expertise) filters.expertise = expertise.split(',');
    if (available === 'true') filters.availability = true;

    const mentors = await this.mentorshipService.findMentors(filters);
    return { success: true, data: mentors };
  }

  @Get('mentors/:id')
  @ApiOperation({ summary: 'Get mentor profile' })
  async getMentorProfile(@Param('id') id: string) {
    const profile = await this.mentorshipService.findMentors();
    return { success: true, data: profile };
  }

  @Post('requests')
  @ApiOperation({ summary: 'Request mentorship' })
  async requestMentorship(@Request() req, @Body() dto: RequestMentorshipDto) {
    const mentorship = await this.mentorshipService.requestMentorship(
      req.user.id,
      dto.mentorId,
      dto,
    );
    return { success: true, data: mentorship };
  }

  @Put('requests/:id/approve')
  @ApiOperation({ summary: 'Approve mentorship request' })
  async approveMentorship(@Request() req, @Param('id') id: string) {
    const mentorship = await this.mentorshipService.approveMentorship(id, req.user.id);
    return { success: true, data: mentorship };
  }

  @Put('requests/:id/reject')
  @ApiOperation({ summary: 'Reject mentorship request' })
  async rejectMentorship(@Request() req, @Param('id') id: string, @Body() body: any) {
    await this.mentorshipService.rejectMentorship(id, req.user.id, body.reason);
    return { success: true, message: 'Mentorship request rejected' };
  }

  @Get('my-mentorships')
  @ApiOperation({ summary: 'Get user mentorships' })
  async getMyMentorships(@Request() req, @Query('role') role?: 'mentor' | 'mentee') {
    const mentorships = await this.mentorshipService.getUserMentorships(req.user.id, role);
    return { success: true, data: mentorships };
  }

  @Post(':id/sessions')
  @ApiOperation({ summary: 'Log mentorship session' })
  async logSession(@Param('id') id: string, @Body() dto: LogSessionDto) {
    // Convert DTO to proper format with Date object
    const sessionData: Partial<MentorshipSession> = {
      scheduledAt: new Date(dto.scheduledAt),
      durationMinutes: dto.durationMinutes,
      agenda: dto.agenda,
      notes: dto.notes,
      topics: dto.topics,
    };
    const session = await this.mentorshipService.logSession(id, sessionData);
    return { success: true, data: session };
  }

  @Get(':id/sessions')
  @ApiOperation({ summary: 'Get mentorship sessions' })
  async getSessions(@Param('id') id: string) {
    const sessions = await this.mentorshipService.getMentorshipSessions(id);
    return { success: true, data: sessions };
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete mentorship' })
  async completeMentorship(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    const mentorship = await this.mentorshipService.completeMentorship(req.user.id, id, dto);
    return { success: true, data: mentorship };
  }

  @Post('match')
  @ApiOperation({ summary: 'Find matching mentors' })
  async matchMentors(@Request() req, @Body() preferences: any) {
    const matches = await this.mentorshipService.matchMentors(req.user.id, preferences);
    return { success: true, data: matches };
  }
}
