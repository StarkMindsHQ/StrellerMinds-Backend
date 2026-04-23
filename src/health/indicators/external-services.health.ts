import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';

export interface ExternalServiceConfig {
  name: string;
  url: string;
  timeoutMs: number;
}

@Injectable()
export class ExternalServicesHealthIndicator extends HealthIndicator {
  private readonly serviceChecks: ExternalServiceConfig[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    super();

    // Build the list of external services to check from config
    const stellarRpcUrl = this.configService.get<string>('SOROBAN_RPC_URL');
    if (stellarRpcUrl) {
      this.serviceChecks.push({
        name: 'stellar_soroban',
        url: stellarRpcUrl,
        timeoutMs: 5000,
      });
    }

    const smtpHost = this.configService.get<string>('SMTP_HOST');
    if (smtpHost) {
      // For SMTP we only check config presence; actual SMTP check requires socket
      this.serviceChecks.push({
        name: 'email_smtp',
        url: `http://${smtpHost}:${this.configService.get<string>('SMTP_PORT', '587')}`,
        timeoutMs: 5000,
      });
    }
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const results: Record<string, { status: string; responseTime?: number; error?: string }> = {};

    const checks = this.serviceChecks.map(async (service) => {
      const start = Date.now();
      try {
        await firstValueFrom(
          this.httpService.get(service.url, { timeout: service.timeoutMs }).pipe(
            timeout(service.timeoutMs),
          ),
        );
        results[service.name] = {
          status: 'up',
          responseTime: Date.now() - start,
        };
      } catch (error) {
        results[service.name] = {
          status: 'down',
          error: error instanceof Error ? error.message : 'Connection failed',
        };
      }
    });

    await Promise.all(checks);

    const allUp = Object.values(results).every((r) => r.status === 'up');

    if (allUp) {
      return this.getStatus(key, true, results);
    }

    // At least one service is down — report degraded rather than fully unhealthy
    const hasPartialUp = Object.values(results).some((r) => r.status === 'up');
    if (hasPartialUp) {
      return this.getStatus(key, true, { ...results, overall: 'degraded' });
    }

    throw new HealthCheckError(
      'ExternalServicesCheck failed',
      this.getStatus(key, false, results),
    );
  }
}
