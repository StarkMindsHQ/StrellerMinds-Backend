import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityIncident } from './security-incident.entity';

@Injectable()
export class SecurityAnalyticsService {
  constructor(
    @InjectRepository(SecurityIncident)
    private readonly incidentRepo: Repository<SecurityIncident>,
  ) {}

  async getDashboardStats() {
    const totalIncidents = await this.incidentRepo.count();
    const openIncidents = await this.incidentRepo.count({ where: { status: 'OPEN' as any } });
    const criticalIncidents = await this.incidentRepo.count({ where: { severity: 'CRITICAL' as any } });
    
    const recentIncidents = await this.incidentRepo.find({
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      summary: {
        total: totalIncidents,
        open: openIncidents,
        critical: criticalIncidents,
      },
      recentActivity: recentIncidents,
    };
  }

  async getUserSecurityScore(userId: string): Promise<number> {
    const incidents = await this.incidentRepo.find({ where: { userId } });
    let score = 100;

    for (const incident of incidents) {
      switch (incident.severity) {
        case 'CRITICAL' as any: score -= 30; break;
        case 'HIGH' as any: score -= 15; break;
        case 'MEDIUM' as any: score -= 5; break;
        case 'LOW' as any: score -= 1; break;
      }
    }

    return Math.max(0, score);
  }
}