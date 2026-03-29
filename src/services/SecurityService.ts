import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SecurityHeaders, HeaderConfig } from '../security/SecurityHeaders';
import { CSPManager } from '../security/CSPManager';
import { SecurityScanner, Vulnerability } from '../security/SecurityScanner';

@Injectable()
export class SecurityService implements OnModuleInit {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    private readonly securityHeaders: SecurityHeaders,
    private readonly cspManager: CSPManager,
    private readonly securityScanner: SecurityScanner,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing Security Service');
    this.startPeriodicScanning();
  }

  private startPeriodicScanning(): void {
    setInterval(() => {
      this.performSecurityScan();
    }, 3600000); // Scan every hour
  }

  /**
   * Performs an automated security scan and returns vulnerabilities.
   */
  async performSecurityScan(): Promise<Vulnerability[]> {
    this.logger.info('Starting automated periodic security scan');
    const vulnerabilities = await this.securityScanner.performScan();
    
    if (vulnerabilities.some(v => v.severity === 'critical' || v.severity === 'high')) {
      this.logger.warn(`Security scan completed. Found ${vulnerabilities.length} vulnerabilities requiring immediate attention.`);
    }

    return vulnerabilities;
  }

  /**
   * Retrieves all combined security headers including CSP.
   */
  getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    this.securityHeaders.getHeaders().forEach((h) => {
      headers[h.name] = h.value;
    });

    headers['Content-Security-Policy'] = this.cspManager.generateHeaderString();
    return headers;
  }

  /**
   * Generates a security assessment report.
   */
  generateAssessment(): string {
    const scanReport = this.securityScanner.generateAssessmentReport();
    const headerCount = this.securityHeaders.getHeaders().length;
    
    return `${scanReport}\nDynamic Headers Configured: ${headerCount}\nCSP Strategy: Configured and Active`;
  }

  /**
   * Updates a security header.
   */
  updateHeader(name: string, value: string): void {
    this.securityHeaders.setHeader(name, value);
    this.logger.log(`Security header updated: ${name}`);
  }

  /**
   * Adds a value to a CSP directive.
   */
  updateCSPDirective(name: string, value: string): void {
    this.cspManager.addDirectiveValue(name, value);
    this.logger.log(`CSP directive updated: ${name}`);
  }
}
