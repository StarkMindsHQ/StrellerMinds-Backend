import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CdnService {
  private readonly cdnBaseUrl: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.cdnBaseUrl = configService.get<string>('CDN_BASE_URL', '');
    this.enabled = !!this.cdnBaseUrl;
  }

  /**
   * Returns the CDN URL for a given asset path.
   * Falls back to the local path if CDN is not configured.
   */
  getAssetUrl(assetPath: string): string {
    if (!this.enabled) return assetPath;
    const cleanPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
    return `${this.cdnBaseUrl}${cleanPath}`;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
