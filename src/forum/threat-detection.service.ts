import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { SecurityAudit, SecurityEvent } from '../auth/entities/security-audit.entity';
import { SecurityResponseService } from './security-response.service';
import { IncidentSeverity } from './security-incident.entity';

@Injectable()
export class ThreatDetectionService {
  private readonly logger = new Logger(ThreatDetectionService.name);

  constructor(
    @InjectRepository(SecurityAudit)
    private readonly auditRepo: Repository<SecurityAudit>,
    private readonly responseService: SecurityResponseService,
  ) {}

  async analyzeEvent(audit: SecurityAudit): Promise<void> {
    try {
      await Promise.all([
        this.detectBruteForce(audit),
        this.detectImpossibleTravel(audit),
        this.detectSuspiciousIp(audit),
      ]);
    } catch (error) {
      this.logger.error(`Error analyzing security event: ${error.message}`, error.stack);
    }
  }

  private async detectBruteForce(audit: SecurityAudit): Promise<void> {
    // Assuming SecurityEvent enum has LOGIN_FAILED
    if (audit.event !== 'LOGIN_FAILED' as SecurityEvent) return;

    const windowMinutes = 15;
    const threshold = 5;
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);

    const count = await this.auditRepo.count({
      where: {
        ipAddress: audit.ipAddress,
        event: 'LOGIN_FAILED' as SecurityEvent,
        createdAt: MoreThan(since),
      },
    });

    if (count >= threshold) {
      await this.responseService.createIncident({
        type: 'BRUTE_FORCE_ATTACK',
        severity: IncidentSeverity.HIGH,
        description: `Detected ${count} failed login attempts from IP ${audit.ipAddress} in the last ${windowMinutes} minutes.`,
        ipAddress: audit.ipAddress,
        userId: audit.userId,
        details: { attemptCount: count, windowMinutes },
      });
    }
  }

  private async detectImpossibleTravel(audit: SecurityAudit): Promise<void> {
    if (!audit.userId || !audit.metadata?.location || audit.event !== 'LOGIN_SUCCESS' as SecurityEvent) return;

    const previousLogins = await this.auditRepo.find({
      where: { 
        userId: audit.userId,
        event: 'LOGIN_SUCCESS' as SecurityEvent
      } as any,
      order: { createdAt: 'DESC' },
      skip: 1, // Skip the current event
    });

    const lastLogin = previousLogins[0];

    if (lastLogin && lastLogin.metadata?.location) {
      const currentLoc = audit.metadata.location;
      const lastLoc = lastLogin.metadata.location;

      if (currentLoc.country !== lastLoc.country) {
        const timeDiffMs = audit.createdAt.getTime() - lastLogin.createdAt.getTime();
        const hoursDiff = timeDiffMs / (1000 * 60 * 60);
        
        // Heuristic: if country changed in less than 2 hours
        if (hoursDiff < 2) {
          await this.responseService.createIncident({
            type: 'IMPOSSIBLE_TRAVEL',
            severity: IncidentSeverity.MEDIUM,
            description: `Impossible travel detected: Login from ${currentLoc.country} ${hoursDiff.toFixed(1)} hours after login from ${lastLoc.country}.`,
            userId: audit.userId,
            ipAddress: audit.ipAddress,
            details: { 
              previousLocation: lastLoc,
              currentLocation: currentLoc,
              timeDifferenceHours: hoursDiff 
            },
          });
        }
      }
    }
  }

  private async detectSuspiciousIp(audit: SecurityAudit): Promise<void> {
    // Placeholder for IP reputation logic integration
    // In a production environment, this would check against a threat intelligence feed
    const suspiciousIps = ['1.2.3.4', '5.6.7.8']; // Example blacklist
    
    if (audit.ipAddress && suspiciousIps.includes(audit.ipAddress)) {
      await this.responseService.createIncident({
        type: 'SUSPICIOUS_IP',
        severity: IncidentSeverity.HIGH,
        description: `Activity detected from known suspicious IP: ${audit.ipAddress}`,
        ipAddress: audit.ipAddress,
        userId: audit.userId,
      });
    }
  }
}