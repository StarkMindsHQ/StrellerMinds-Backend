import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityIncident, IncidentSeverity } from '../entities/security-incident.entity';

@Injectable()
export class SecurityResponseService {
  private readonly logger = new Logger(SecurityResponseService.name);

  constructor(
    @InjectRepository(SecurityIncident)
    private readonly incidentRepo: Repository<SecurityIncident>,
  ) {}

  async createIncident(data: Partial<SecurityIncident>): Promise<SecurityIncident> {
    const incident = this.incidentRepo.create(data);
    const savedIncident = await this.incidentRepo.save(incident);
    
    await this.handleAutomatedResponse(savedIncident);
    
    return savedIncident;
  }

  private async handleAutomatedResponse(incident: SecurityIncident): Promise<void> {
    if (incident.severity === IncidentSeverity.CRITICAL || incident.severity === IncidentSeverity.HIGH) {
      this.logger.warn(`Executing automated response for incident ${incident.id} [${incident.type}]`);
      
      // Automated mitigation strategies
      if (incident.ipAddress) {
        await this.blockIpAddress(incident.ipAddress);
      }
      
      if (incident.userId && incident.severity === IncidentSeverity.CRITICAL) {
        await this.lockUserAccount(incident.userId);
      }
    }
  }

  private async blockIpAddress(ip: string): Promise<void> {
    this.logger.log(`[Security] Blocking IP address: ${ip}`);
    // Implementation would integrate with a Redis blocklist or firewall service
  }

  private async lockUserAccount(userId: string): Promise<void> {
    this.logger.log(`[Security] Locking user account: ${userId}`);
    // Implementation would update the User entity status to LOCKED
  }
}