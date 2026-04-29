import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { IpWhitelistGuard } from './ip-whitelist.guard';
import { RequestSigningService } from './request-signing.service';
import { SecurityHeadersMiddleware } from './security-headers.middleware';

@Module({
  providers: [ApiKeyService, RequestSigningService, IpWhitelistGuard, SecurityHeadersMiddleware],
  exports: [ApiKeyService, RequestSigningService, IpWhitelistGuard, SecurityHeadersMiddleware],
})
export class SecurityModule {}
