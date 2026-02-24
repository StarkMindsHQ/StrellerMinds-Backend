import { securityLogger } from "./security.logger";

export function monitorSuspiciousActivity(req: any, event: string) {
  securityLogger.warn({
    ip: req.ip,
    user: req.user?.id,
    event,
    timestamp: new Date().toISOString(),
  });
}