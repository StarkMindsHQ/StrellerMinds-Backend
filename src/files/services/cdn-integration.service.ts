import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface CDNConfig {
  provider: 'cloudflare' | 'cloudfront' | 'fastly' | 'keycdn';
  zoneId?: string;
  distributionId?: string;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
}

export interface CDNCacheConfig {
  ttl: number;
  edgeTTL?: number;
  browserTTL?: number;
  cacheKey?: string;
  bypassCache?: boolean;
}

@Injectable()
export class CDNIntegrationService {
  private readonly logger = new Logger(CDNIntegrationService.name);
  private config: CDNConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      provider: this.configService.get('CDN_PROVIDER') as any || 'cloudflare',
      zoneId: this.configService.get('CDN_ZONE_ID'),
      distributionId: this.configService.get('CDN_DISTRIBUTION_ID'),
      apiKey: this.configService.get('CDN_API_KEY'),
      apiSecret: this.configService.get('CDN_API_SECRET'),
      baseUrl: this.configService.get('CDN_BASE_URL'),
    };
  }

  async cacheFile(
    fileUrl: string,
    cacheConfig: CDNCacheConfig = { ttl: 86400 }, // 24 hours default
  ): Promise<string> {
    try {
      const cdnUrl = await this.getCDNUrl(fileUrl);
      
      switch (this.config.provider) {
        case 'cloudflare':
          await this.cacheWithCloudflare(cdnUrl, cacheConfig);
          break;
        case 'cloudfront':
          await this.cacheWithCloudFront(cdnUrl, cacheConfig);
          break;
        case 'fastly':
          await this.cacheWithFastly(cdnUrl, cacheConfig);
          break;
        case 'keycdn':
          await this.cacheWithKeyCDN(cdnUrl, cacheConfig);
          break;
        default:
          this.logger.warn(`CDN provider ${this.config.provider} not supported`);
      }

      return cdnUrl;
    } catch (error) {
      this.logger.error('Failed to cache file in CDN', error);
      return fileUrl; // Fallback to original URL
    }
  }

  async purgeFile(fileUrl: string): Promise<boolean> {
    try {
      const cdnUrl = await this.getCDNUrl(fileUrl);
      
      switch (this.config.provider) {
        case 'cloudflare':
          await this.purgeWithCloudflare([cdnUrl]);
          break;
        case 'cloudfront':
          await this.purgeWithCloudFront([cdnUrl]);
          break;
        case 'fastly':
          await this.purgeWithFastly([cdnUrl]);
          break;
        case 'keycdn':
          await this.purgeWithKeyCDN([cdnUrl]);
          break;
        default:
          this.logger.warn(`CDN provider ${this.config.provider} not supported`);
          return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to purge file from CDN', error);
      return false;
    }
  }

  async purgeMultipleFiles(fileUrls: string[]): Promise<{ success: string[]; failed: string[] }> {
    const results = { success: [], failed: [] };

    try {
      const cdnUrls = await Promise.all(
        fileUrls.map(url => this.getCDNUrl(url))
      );

      switch (this.config.provider) {
        case 'cloudflare':
          await this.purgeWithCloudflare(cdnUrls);
          results.success.push(...fileUrls);
          break;
        case 'cloudfront':
          await this.purgeWithCloudFront(cdnUrls);
          results.success.push(...fileUrls);
          break;
        case 'fastly':
          await this.purgeWithFastly(cdnUrls);
          results.success.push(...fileUrls);
          break;
        case 'keycdn':
          await this.purgeWithKeyCDN(cdnUrls);
          results.success.push(...fileUrls);
          break;
        default:
          results.failed.push(...fileUrls);
      }
    } catch (error) {
      this.logger.error('Failed to purge multiple files from CDN', error);
      results.failed.push(...fileUrls);
    }

    return results;
  }

  async getCacheStatus(fileUrl: string): Promise<{
    cached: boolean;
    cacheAge?: number;
    ttl?: number;
  }> {
    // This would depend on CDN provider APIs
    // For now, return a basic implementation
    try {
      const response = await axios.head(fileUrl);
      const cacheControl = response.headers['cache-control'];
      const age = response.headers['age'];
      
      return {
        cached: response.status === 200 && age ? parseInt(age) > 0 : false,
        cacheAge: age ? parseInt(age) : undefined,
        ttl: cacheControl ? this.extractTTLFromCacheControl(cacheControl) : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to get cache status', error);
      return { cached: false };
    }
  }

  async preloadFile(fileUrl: string): Promise<boolean> {
    try {
      // Preload by making a request to the CDN URL
      const cdnUrl = await this.getCDNUrl(fileUrl);
      await axios.get(cdnUrl, { timeout: 30000 });
      return true;
    } catch (error) {
      this.logger.error('Failed to preload file', error);
      return false;
    }
  }

  private async getCDNUrl(originalUrl: string): Promise<string> {
    if (this.config.baseUrl) {
      // Convert storage URL to CDN URL
      const url = new URL(originalUrl);
      const cdnBase = new URL(this.config.baseUrl);
      return `${cdnBase.origin}${url.pathname}`;
    }
    return originalUrl;
  }

  private async cacheWithCloudflare(
    url: string,
    cacheConfig: CDNCacheConfig,
  ): Promise<void> {
    if (!this.config.apiKey || !this.config.zoneId) {
      throw new Error('Cloudflare API credentials not configured');
    }

    // Cloudflare caching is automatic, but we can set custom cache headers
    // This would typically be done at the edge worker level
    this.logger.log(`Cloudflare cache configured for ${url}`);
  }

  private async purgeWithCloudflare(urls: string[]): Promise<void> {
    if (!this.config.apiKey || !this.config.zoneId) {
      throw new Error('Cloudflare API credentials not configured');
    }

    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/zones/${this.config.zoneId}/purge_cache`,
      { files: urls },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.data.success) {
      this.logger.log(`Successfully purged ${urls.length} URLs from Cloudflare`);
    } else {
      throw new Error(`Cloudflare purge failed: ${JSON.stringify(response.data.errors)}`);
    }
  }

  private async cacheWithCloudFront(
    url: string,
    cacheConfig: CDNCacheConfig,
  ): Promise<void> {
    // CloudFront caching is configured through distribution settings
    this.logger.log(`CloudFront cache configured for ${url}`);
  }

  private async purgeWithCloudFront(urls: string[]): Promise<void> {
    if (!this.config.distributionId) {
      throw new Error('CloudFront distribution ID not configured');
    }

    // This would require AWS SDK for CloudFront
    this.logger.log(`Purging ${urls.length} URLs from CloudFront`);
  }

  private async cacheWithFastly(
    url: string,
    cacheConfig: CDNCacheConfig,
  ): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Fastly API key not configured');
    }

    // Fastly caching configuration
    this.logger.log(`Fastly cache configured for ${url}`);
  }

  private async purgeWithFastly(urls: string[]): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Fastly API key not configured');
    }

    const response = await axios.post(
      'https://api.fastly.com/purge',
      { urls },
      {
        headers: {
          'Fastly-Key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.data.status === 'ok') {
      this.logger.log(`Successfully purged ${urls.length} URLs from Fastly`);
    } else {
      throw new Error(`Fastly purge failed: ${JSON.stringify(response.data)}`);
    }
  }

  private async cacheWithKeyCDN(
    url: string,
    cacheConfig: CDNCacheConfig,
  ): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('KeyCDN API key not configured');
    }

    this.logger.log(`KeyCDN cache configured for ${url}`);
  }

  private async purgeWithKeyCDN(urls: string[]): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('KeyCDN API key not configured');
    }

    const response = await axios.delete(
      'https://api.keycdn.com/purge',
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        data: { urls },
      },
    );

    if (response.data.status === 'success') {
      this.logger.log(`Successfully purged ${urls.length} URLs from KeyCDN`);
    } else {
      throw new Error(`KeyCDN purge failed: ${JSON.stringify(response.data)}`);
    }
  }

  private extractTTLFromCacheControl(cacheControl: string): number {
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    return maxAgeMatch ? parseInt(maxAgeMatch[1]) : undefined;
  }

  generateCDNUrl(originalUrl: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  } = {}): string {
    const url = new URL(originalUrl);
    
    // Add CDN-specific query parameters for image optimization
    if (options.width || options.height || options.quality || options.format) {
      const params = new URLSearchParams();
      
      if (options.width) params.set('w', options.width.toString());
      if (options.height) params.set('h', options.height.toString());
      if (options.quality) params.set('q', options.quality.toString());
      if (options.format) params.set('f', options.format);
      
      url.search = params.toString();
    }

    return url.toString();
  }
}
