import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly whitelist: string[] = (
    process.env.ADMIN_IP_WHITELIST || '127.0.0.1,::1,::ffff:127.0.0.1'
  ).split(',').map((ip) => ip.trim());

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip
      || req.socket.remoteAddress
      || '';

    if (!this.whitelist.includes(ip)) {
      throw new ForbiddenException('Access denied: IP not whitelisted');
    }
    return true;
  }
}
