import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WithdrawalsService {
  constructor(private prisma: PrismaService) {}

  async createWithdrawalRequest(user: any, projectId: string, amount: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { withdrawals: true }
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    if (project.creatorId !== user.id) {
      throw new ForbiddenException('You do not own this project');
    }

    if (!project.isCompleted) {
      throw new BadRequestException('Project is not completed yet');
    }

    const withdrawnAmount = project.withdrawals
      .filter(w => ['PENDING', 'APPROVED', 'PAID'].includes(w.status))
      .reduce((sum, w) => sum + w.amount, 0);

    const availableFunds = project.fundsRaised - withdrawnAmount;

    if (amount > availableFunds) {
      throw new BadRequestException('Insufficient funds to withdraw that amount');
    }

    const withdrawal = await this.prisma.withdrawal.create({
      data: { project_id: projectId, amount, status: 'PENDING' }
    });

    console.log(`[Notification] Admin: New withdrawal request ${withdrawal.id} for project ${withdrawal.project_id}`);
    return withdrawal;
  }
}