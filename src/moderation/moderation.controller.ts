import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ModerationActionDto } from './dto/create-moderation-action.dto';

// Define custom request type
interface AuthenticatedRequest extends Request {
  user?: { id: string }; // Ensure TypeScript recognizes 'user'
}

// Moderation Controller
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('log')
  @UseGuards(AuthGuard('jwt')) // Specify strategy
  async logModerationAction(
    @Body() actionDto: ModerationActionDto,
    @Req() req: AuthenticatedRequest, // Use the custom request type
  ) {
    if (!req.user) {
      throw new Error('User not found in request'); // Handle missing user
    }

    return this.moderationService.logModerationAction(
      actionDto.action,
      actionDto.entityType,
      actionDto.entityId,
      req.user.id, // Now TypeScript will not complain
    );
  }
}
