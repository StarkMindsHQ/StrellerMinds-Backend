import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { AuditLog } from "./entities/audit-log.entity"
import { AuditLogService } from "./services/audit-log.service"
import { AuditLogRetentionService } from "./services/audit-log-retention.service"
import { AuditLogController } from "./controllers/audit-log.controller"
import { AuditLogInterceptor } from "./interceptors/audit-log.interceptor"
import { AuditLogAccessGuard } from "./guards/audit-log-access.guard"

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditLogRetentionService, AuditLogInterceptor, AuditLogAccessGuard],
  exports: [AuditLogService, AuditLogInterceptor],
})
export class AuditLogModule {}
