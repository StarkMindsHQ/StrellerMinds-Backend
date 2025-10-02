import * as crypto from 'crypto';

export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function validateEmailAddress(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeHtml(html: string): string {
  // This is a simple example - in production, use a proper HTML sanitizer library
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}
