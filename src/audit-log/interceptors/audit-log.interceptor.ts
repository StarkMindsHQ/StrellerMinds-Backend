import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler, Logger } from "@nestjs/common"
import type { Reflector } from "@nestjs/core"
import { type Observable, tap, catchError, throwError } from "rxjs"
import type { AuditLogService } from "../services/audit-log.service"
import { AUDIT_LOG_KEY, type AuditLogOptions } from "../decorators/audit-log.decorator"
import { AuditSeverity } from "../entities/audit-log.entity"

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name)

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditLogOptions>(AUDIT_LOG_KEY, context.getHandler())

    if (!auditOptions) {
      return next.handle()
    }

    const request = context.switchToHttp().getRequest()
    const startTime = Date.now()

    return next.handle().pipe(
      tap((response) => {
        this.logAuditEvent(request, auditOptions, true, null, Date.now() - startTime, response)
      }),
      catchError((error) => {
        this.logAuditEvent(request, auditOptions, false, error.message, Date.now() - startTime)
        return throwError(() => error)
      }),
    )
  }

  private async logAuditEvent(
    request: any,
    options: AuditLogOptions,
    isSuccessful: boolean,
    errorMessage?: string,
    duration?: number,
    response?: any,
  ) {
    try {
      const user = request.user // Assuming user is attached to request by auth guard

      if (!user) {
        this.logger.warn("No user found in request for audit logging")
        return
      }

      const metadata: Record<string, any> = {
        method: request.method,
        url: request.url,
        params: request.params,
        query: request.query,
      }

      if (options.includeRequestBody && request.body) {
        metadata.requestBody = this.sanitizeData(request.body)
      }

      if (options.includeResponseBody && response) {
        metadata.responseBody = this.sanitizeData(response)
      }

      await this.auditLogService.createLog({
        adminId: user.id,
        adminEmail: user.email,
        adminRole: user.role,
        actionType: options.actionType,
        resourceType: options.resourceType,
        resourceId: request.params?.id,
        description: options.description || `${options.actionType} ${options.resourceType}`,
        metadata,
        severity: options.severity || AuditSeverity.MEDIUM,
        ipAddress: this.getClientIp(request),
        userAgent: request.headers["user-agent"],
        sessionId: request.sessionID,
        isSuccessful,
        errorMessage,
        duration,
      })
    } catch (error) {
      this.logger.error("Failed to create audit log", error.stack)
    }
  }

  private getClientIp(request: any): string {
    return (
      request.headers["x-forwarded-for"]?.split(",")[0] ||
      request.headers["x-real-ip"] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      "0.0.0.0"
    )
  }

  private sanitizeData(data: any): any {
    if (!data) return data

    const sensitiveFields = ["password", "token", "secret", "key", "authorization"]
    const sanitized = JSON.parse(JSON.stringify(data))

    const sanitizeObject = (obj: any) => {
      if (typeof obj !== "object" || obj === null) return obj

      for (const key in obj) {
        if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
          obj[key] = "[REDACTED]"
        } else if (typeof obj[key] === "object") {
          sanitizeObject(obj[key])
        }
      }
    }

    sanitizeObject(sanitized)
    return sanitized
  }
}
