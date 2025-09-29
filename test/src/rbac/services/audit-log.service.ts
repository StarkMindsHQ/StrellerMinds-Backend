import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
  ) {}

  async log(userId: string, action: string, resource: string, details?: any) {
    const log = this.auditLogRepo.create({ userId, action, resource, details });
    return this.auditLogRepo.save(log);
  }

  async getLogsForUser(userId: string) {
    return this.auditLogRepo.find({ where: { userId } });
  }

  async getAllLogs() {
    return this.auditLogRepo.find();
  }
}
