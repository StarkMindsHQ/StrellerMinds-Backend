import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { AttemptsService } from '../services/attempts.service';
import { StartAttemptDto } from '../dto/start-attempt.dto';
import { SubmitAttemptDto } from '../dto/submit-attempt.dto';

@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post('start')
  start(@Body() dto: StartAttemptDto, @Req() req: any) {
    const userId = req.user?.id;
    const ip = req.ip || req.headers?.['x-forwarded-for'] || null;
    const ua = req.headers?.['user-agent'];
    return this.attemptsService.startAttempt(dto, userId, ip, ua);
  }

  @Post('submit')
  submit(@Body() dto: SubmitAttemptDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.attemptsService.submitAttempt(dto, userId);
  }

  @Post('proctor/event')
  proctorEvent(@Body() payload: any) {
    // payload: { attemptId, event }
    return this.attemptsService.logProctorEvent(payload.attemptId, payload.event);
  }
}
