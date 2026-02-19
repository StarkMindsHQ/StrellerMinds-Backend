import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityAudit, SecurityEvent } from '../entities/security-audit.entity';
import { GeoIpService } from './geo-ip.service';
import { ThreatDetectionService } from 'src/forum/threat-detection.service';

@Injectable()
export class SecurityAuditService {
    constructor(
        @InjectRepository(SecurityAudit)
        private readonly auditRepository: Repository<SecurityAudit>,
        private readonly geoIpService: GeoIpService,
        private readonly threatDetectionService: ThreatDetectionService,
    ) { }

    async log(
        userId: string | null,
        event: SecurityEvent,
        ipAddress?: string,
        userAgent?: string,
        metadata?: any,
    ): Promise<void> {
        const location = ipAddress ? this.geoIpService.lookup(ipAddress) : null;

        const audit = this.auditRepository.create({
            userId,
            event,
            ipAddress,
            userAgent,
            metadata: { ...metadata, location },
        });

        const savedAudit = await this.auditRepository.save(audit);

        // Analyze event for threats asynchronously
        this.threatDetectionService.analyzeEvent(savedAudit).catch(err => {
            console.error('Threat detection analysis failed:', err);
        });
    }

    async getRecentEvents(userId: string | null, limit: number = 10): Promise<SecurityAudit[]> {
        const query = this.auditRepository.createQueryBuilder('audit')
            .orderBy('audit.createdAt', 'DESC')
            .take(limit);

        if (userId) {
            query.where('audit.userId = :userId', { userId });
        }

        return query.getMany();
    }
}
