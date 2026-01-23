import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityAudit, SecurityEvent } from '../entities/security-audit.entity';
import { GeoIpService } from './geo-ip.service';

@Injectable()
export class SecurityAuditService {
    constructor(
        @InjectRepository(SecurityAudit)
        private readonly auditRepository: Repository<SecurityAudit>,
        private readonly geoIpService: GeoIpService,
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

        await this.auditRepository.save(audit);
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
