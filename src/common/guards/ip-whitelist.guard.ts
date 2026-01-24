import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../auth/entities/user.entity';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // Only check for admins
        if (user && user.role === UserRole.ADMIN) {
            const whitelist = this.configService.get<string>('ADMIN_IP_WHITELIST');

            if (!whitelist) {
                return true; // No whitelist configured, allow all (or block all? allow for now)
            }

            const allowedIps = whitelist.split(',').map(ip => ip.trim());
            const clientIp = request.ip || request.connection.remoteAddress;

            if (!allowedIps.includes(clientIp)) {
                throw new ForbiddenException('Access denied: IP not whitelisted');
            }
        }

        return true;
    }
}
