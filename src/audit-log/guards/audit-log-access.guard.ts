import { Injectable, type CanActivate, type ExecutionContext, ForbiddenException } from "@nestjs/common"

@Injectable()
export class AuditLogAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new ForbiddenException("Authentication required")
    }

    // Only allow super admins and audit managers to access audit logs
    const allowedRoles = ["super_admin", "audit_manager"]

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException("Insufficient permissions to access audit logs")
    }

    return true
  }
}
