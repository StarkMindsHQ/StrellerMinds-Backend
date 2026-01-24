import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { FinancialReport, Payment, Refund, Subscription } from '../entities';
import { PaymentStatus } from '../enums';
import { GenerateReportDto } from '../dto';

@Injectable()
export class FinancialReportingService {
  constructor(
    @InjectRepository(FinancialReport)
    private reportRepository: Repository<FinancialReport>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
  ) {}

  async generateReport(dto: GenerateReportDto): Promise<FinancialReport> {
    const { reportType, period = 'monthly', startDate, endDate } = dto;

    const { start, end } = this.getDateRange(startDate, endDate, period);

    let report: FinancialReport;

    switch (reportType) {
      case 'revenue':
        report = await this.generateRevenueReport(start, end, period);
        break;
      case 'refunds':
        report = await this.generateRefundReport(start, end, period);
        break;
      case 'tax':
        report = await this.generateTaxReport(start, end, period);
        break;
      case 'reconciliation':
        report = await this.generateReconciliationReport(start, end, period);
        break;
      default:
        report = await this.generateGeneralReport(start, end, period);
    }

    return this.reportRepository.save(report);
  }

  private async generateRevenueReport(
    startDate: Date,
    endDate: Date,
    period: string,
  ): Promise<FinancialReport> {
    const payments = await this.paymentRepository.find({
      where: {
        status: PaymentStatus.COMPLETED,
        createdAt: Between(startDate, endDate),
      },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const subscriptions = await this.subscriptionRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    return this.reportRepository.create({
      reportType: 'revenue',
      period,
      startDate,
      endDate,
      totalRevenue,
      totalRefunds: 0,
      netRevenue: totalRevenue,
      transactionCount: payments.length,
      subscriptionCount: subscriptions.length,
      status: 'completed',
      generatedAt: new Date(),
      summary: {
        avgTransaction: payments.length > 0 ? totalRevenue / payments.length : 0,
        topPaymentMethod: this.getTopPaymentMethod(payments),
      },
    });
  }

  private async generateRefundReport(
    startDate: Date,
    endDate: Date,
    period: string,
  ): Promise<FinancialReport> {
    const refunds = await this.refundRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    const totalRefunds = refunds.reduce((sum, r) => sum + Number(r.amount), 0);

    return this.reportRepository.create({
      reportType: 'refunds',
      period,
      startDate,
      endDate,
      totalRevenue: 0,
      totalRefunds,
      netRevenue: -totalRefunds,
      refundCount: refunds.length,
      status: 'completed',
      generatedAt: new Date(),
      summary: {
        refundRate: (refunds.length / Math.max(1, 100)) * 100,
      },
    });
  }

  private async generateTaxReport(
    startDate: Date,
    endDate: Date,
    period: string,
  ): Promise<FinancialReport> {
    const payments = await this.paymentRepository.find({
      where: {
        status: PaymentStatus.COMPLETED,
        createdAt: Between(startDate, endDate),
      },
    });

    // In production, calculate actual tax based on jurisdiction
    const totalTax = payments.reduce((sum, p) => sum + (Number(p.amount) * 0.1), 0);
    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return this.reportRepository.create({
      reportType: 'tax',
      period,
      startDate,
      endDate,
      totalRevenue,
      totalTax,
      netRevenue: totalRevenue - totalTax,
      status: 'completed',
      generatedAt: new Date(),
      summary: {
        effectiveTaxRate: totalRevenue > 0 ? (totalTax / totalRevenue) * 100 : 0,
      },
    });
  }

  private async generateReconciliationReport(
    startDate: Date,
    endDate: Date,
    period: string,
  ): Promise<FinancialReport> {
    const payments = await this.paymentRepository.find({
      where: {
        status: PaymentStatus.COMPLETED,
        createdAt: Between(startDate, endDate),
      },
    });

    const refunds = await this.refundRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalRefunds = refunds.reduce((sum, r) => sum + Number(r.amount), 0);

    return this.reportRepository.create({
      reportType: 'reconciliation',
      period,
      startDate,
      endDate,
      totalRevenue,
      totalRefunds,
      netRevenue: totalRevenue - totalRefunds,
      transactionCount: payments.length,
      refundCount: refunds.length,
      status: 'completed',
      generatedAt: new Date(),
    });
  }

  private async generateGeneralReport(
    startDate: Date,
    endDate: Date,
    period: string,
  ): Promise<FinancialReport> {
    const payments = await this.paymentRepository.find({
      where: {
        status: PaymentStatus.COMPLETED,
        createdAt: Between(startDate, endDate),
      },
    });

    const refunds = await this.refundRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalRefunds = refunds.reduce((sum, r) => sum + Number(r.amount), 0);

    return this.reportRepository.create({
      reportType: 'general',
      period,
      startDate,
      endDate,
      totalRevenue,
      totalRefunds,
      netRevenue: totalRevenue - totalRefunds,
      transactionCount: payments.length,
      refundCount: refunds.length,
      status: 'completed',
      generatedAt: new Date(),
    });
  }

  async getReport(reportId: string): Promise<FinancialReport> {
    const report = await this.reportRepository.findOneBy({ id: reportId });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  async listReports(period?: string): Promise<FinancialReport[]> {
    const query = this.reportRepository.createQueryBuilder('report');

    if (period) {
      query.where('report.period = :period', { period });
    }

    return query.orderBy('report.generatedAt', 'DESC').getMany();
  }

  private getDateRange(
    startDate?: Date,
    endDate?: Date,
    period?: string,
  ): { start: Date; end: Date } {
    const end = endDate || new Date();
    let start: Date;

    if (startDate) {
      start = startDate;
    } else {
      start = new Date(end);
      switch (period) {
        case 'monthly':
          start.setMonth(start.getMonth() - 1);
          break;
        case 'quarterly':
          start.setMonth(start.getMonth() - 3);
          break;
        case 'annual':
          start.setFullYear(start.getFullYear() - 1);
          break;
        default:
          start.setMonth(start.getMonth() - 1);
      }
    }

    return { start, end };
  }

  private getTopPaymentMethod(payments: Payment[]): string {
    const counts = {};
    payments.forEach((p) => {
      counts[p.paymentMethod] = (counts[p.paymentMethod] || 0) + 1;
    });

    return Object.keys(counts).reduce((a, b) =>
      counts[a] > counts[b] ? a : b,
    ) || 'unknown';
  }
}
