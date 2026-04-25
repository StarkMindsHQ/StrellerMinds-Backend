import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { IpWhitelistGuard } from './ip-whitelist.guard';
import { RequestSigningService } from './request-signing.service';

@Module({
  providers: [ApiKeyService, RequestSigningService, IpWhitelistGuard],
  exports: [ApiKeyService, RequestSigningService, IpWhitelistGuard],
})
export class SecurityModule {}
