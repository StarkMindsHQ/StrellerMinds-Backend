import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WithdrawalsService } from './withdrawals.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CREATOR')
  async requestWithdrawal(
    @Req() req: any,
    @Body('projectId') projectId: string,
    @Body('amount') amount: number
  ) {
    return this.withdrawalsService.createWithdrawalRequest(req.user, projectId, amount);
  }
}