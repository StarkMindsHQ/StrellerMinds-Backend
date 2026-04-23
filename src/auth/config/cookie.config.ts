/**
 * Cookie configuration for secure token storage
 */

export interface CookieConfig {
  name: string;
  maxAge: number; // in milliseconds
  httpOnly: boolean;
  secure: boolean; // HTTPS only in production
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  domain?: string;
}

export const JWT_COOKIE_CONFIG: CookieConfig = {
  name: 'accessToken',
  maxAge: 15 * 60 * 1000, // 15 minutes
  httpOnly: true, // Prevents JavaScript from accessing
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax', // Prevents CSRF attacks
  path: '/',
  domain: process.env.COOKIE_DOMAIN,
};

export const REFRESH_TOKEN_COOKIE_CONFIG: CookieConfig = {
  name: 'refreshToken',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true, // Prevents JavaScript from accessing
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax', // Prevents CSRF attacks
  path: '/',
  domain: process.env.COOKIE_DOMAIN,
};

export const SESSION_COOKIE_CONFIG: CookieConfig = {
  name: 'sessionId',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  domain: process.env.COOKIE_DOMAIN,
};

/**
 * Cookie options compatible with express Response.cookie()
 */
export function getCookieOptions(config: CookieConfig) {
  return {
    maxAge: config.maxAge,
    httpOnly: config.httpOnly,
    secure: config.secure,
    sameSite: config.sameSite,
    path: config.path,
    domain: config.domain,
  };
}
