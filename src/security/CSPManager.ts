import { Injectable, Logger } from '@nestjs/common';

export interface CSPDirective {
  name: string;
  values: string[];
}

@Injectable()
export class CSPManager {
  private readonly logger = new Logger(CSPManager.name);
  private directives: CSPDirective[] = [];

  constructor() {
    this.initializeDirectives();
  }

  private initializeDirectives() {
    this.logger.log('Initializing Content Security Policy directives');
    
    this.directives = [
      { name: 'default-src', values: ["'self'"] },
      { name: 'script-src', values: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'] },
      { name: 'style-src', values: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'] },
      { name: 'img-src', values: ["'self'", 'data:', 'https://images.unsplash.com'] },
      { name: 'font-src', values: ["'self'", 'https://fonts.gstatic.com'] },
      { name: 'connect-src', values: ["'self'", 'https://api.strellerminds.com'] },
      { name: 'frame-ancestors', values: ["'none'"] },
      { name: 'form-action', values: ["'self'"] },
      { name: 'upgrade-insecure-requests', values: [] },
    ];
  }

  /**
   * Generates the CSP header string.
   */
  generateHeaderString(): string {
    return this.directives
      .map((d) => {
        if (d.values.length === 0) return d.name;
        return `${d.name} ${d.values.join(' ')}`;
      })
      .join('; ');
  }

  /**
   * Updates or adds a CSP directive value.
   */
  addDirectiveValue(name: string, value: string): void {
    const directive = this.directives.find((d) => d.name === name);
    if (directive) {
      if (!directive.values.includes(value)) {
        directive.values.push(value);
      }
    } else {
      this.directives.push({ name, values: [value] });
    }
  }

  /**
   * Removes a CSP directive value.
   */
  removeDirectiveValue(name: string, value: string): void {
    const directive = this.directives.find((d) => d.name === name);
    if (directive) {
      directive.values = directive.values.filter((v) => v !== value);
    }
  }
}
