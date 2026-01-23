import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { DisputeService } from '../services';
import { DisputeStatus } from '../enums';

@Controller('disputes')
export class DisputeController {
  constructor(private disputeService: DisputeService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async initiateDispute(
    @Request() req,
    @Body() body: { paymentId: string; reason: string; description?: string },
  ): Promise<any> {
    return this.disputeService.initiateDispute(
      req.user.id,
      body.paymentId,
      body.reason,
      body.description,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserDisputes(@Request() req): Promise<any> {
    return this.disputeService.getUserDisputes(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getDispute(@Param('id') id: string): Promise<any> {
    return this.disputeService.getDispute(id);
  }

  @Post(':id/evidence')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async submitEvidence(
    @Param('id') id: string,
    @Body() body: { evidence: string[] },
  ): Promise<any> {
    return this.disputeService.submitEvidence(id, body.evidence);
  }

  @Post(':id/resolve')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async resolveDispute(
    @Param('id') id: string,
    @Body() body: { resolution: string; won: boolean },
  ): Promise<any> {
    return this.disputeService.resolveDispute(id, body.resolution, body.won);
  }

  @Post(':id/appeal')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async appealDispute(@Param('id') id: string): Promise<any> {
    return this.disputeService.appealDispute(id);
  }

  @Get()
  async listDisputes(
    @Query('status') status?: DisputeStatus,
    @Query('userId') userId?: string,
  ): Promise<any> {
    return this.disputeService.listDisputes(status, userId);
  }
}
