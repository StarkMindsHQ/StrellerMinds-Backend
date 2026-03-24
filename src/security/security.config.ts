import { Request } from 'express';

export interface CorsConfig {
  origin: string | string[] | boolean;
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  maxAge?: number;
  optionsSuccessStatus?: number;
  preflightContinue?: boolean;
}

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: {
    directives: Record<string, string[]>;
  };
  crossOriginEmbedderPolicy?: boolean;
  crossOriginOpenerPolicy?: boolean;
  crossOriginResourcePolicy?: { policy: 'cross-origin' | 'same-origin' | 'same-site' };
  dnsPrefetchControl?: boolean;
  frameguard?: { action: 'deny' | 'sameorigin' | 'allow-from' | 'allow-all' };
  hidePoweredBy?: boolean;
  hsts?: {
    maxAge: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  ieNoOpen?: boolean;
  noSniff?: boolean;
  originAgentCluster?: boolean;
  permittedCrossDomainPolicies?: boolean;
  referrerPolicy?: { policy: string };
  xssFilter?: boolean;
}

export interface CsrfConfig {
  cookie?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  };
  ignoreMethods?: string[];
  value?: (req: Request & { csrfToken?: () => string }) => string;
}

export const SECURITY_CONFIG = {
  cors: {
    // Environment-specific origin configuration
    origin: (() => {
      const env = process.env.NODE_ENV;
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      
      if (env === 'production') {
        return [
          'https://strellerminds.com',
          'https://www.strellerminds.com',
          'https://app.strellerminds.com',
          ...allowedOrigins.filter(origin => origin.startsWith('https://')),
        ];
      }
      
      if (env === 'staging') {
        return [
          'https://staging.strellerminds.com',
          'https://app-staging.strellerminds.com',
          ...allowedOrigins.filter(origin => origin.startsWith('https://')),
        ];
      }
      
      // Development - allow local origins with validation
      const devOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:4200', // Angular dev server
        'http://localhost:8080', // Vue dev server
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ];
      
      return [...devOrigins, ...allowedOrigins];
    })(),
    
    // Credential handling policies
    credentials: process.env.NODE_ENV === 'production' 
      ? true // Allow credentials in production for trusted origins
      : true, // Allow credentials in development for testing
    
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-API-Key',
      'Accept',
      'Origin',
      'X-Client-Version',
      'X-Request-ID',
    ],
    
    exposedHeaders: [
      'X-Total-Count', 
      'X-Page-Count', 
      'X-Rate-Limit-Remaining',
      'X-Rate-Limit-Reset',
    ],
    
    maxAge: process.env.NODE_ENV === 'production' ? 86400 : 7200, // 24h in prod, 2h in dev
    
    // Enhanced preflight request validation
    optionsSuccessStatus: 204,
    preflightContinue: false,
  } as CorsConfig,

  securityHeaders: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'https://api.stripe.com', 'https://soroban-testnet.stellar.org'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'blob:'],
        frameSrc: ["'none'"],
        childSrc: ["'none'"],
        workerSrc: ["'self'", 'blob:'],
        manifestSrc: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Disabled for compatibility
    crossOriginOpenerPolicy: false, // Disabled for compatibility
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
    xssFilter: true,
  } as SecurityHeadersConfig,

  csrf: {
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    value: (req: Request & { csrfToken?: () => string }) => req.csrfToken?.() ?? '',
  } as CsrfConfig,
};
