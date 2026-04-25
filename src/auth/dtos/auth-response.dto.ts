/**
 * Auth response DTOs that don't expose tokens in the JSON body
 * Tokens are sent via secure httpOnly cookies instead
 */

import { Exclude } from 'class-transformer';

export class AuthResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: Date;

  constructor(partial: Partial<AuthResponseDto>) {
    Object.assign(this, partial);
  }
}

export class LoginResponseDto {
  user: AuthResponseDto;
  message: string;
  // Token is NOT included - it's in httpOnly cookie
  // This prevents XSS attacks that try to steal the token from JSON

  constructor(user: AuthResponseDto, message = 'Login successful') {
    this.user = user;
    this.message = message;
  }
}

export class RegisterResponseDto {
  user: AuthResponseDto;
  message: string;

  constructor(user: AuthResponseDto, message = 'Registration successful') {
    this.user = user;
    this.message = message;
  }
}

export class RefreshResponseDto {
  message: string;
  expiresIn: string;
  // Token is NOT included - it's in httpOnly cookie

  constructor(message = 'Token refreshed successfully', expiresIn = '15m') {
    this.message = message;
    this.expiresIn = expiresIn;
  }
}

export class LogoutResponseDto {
  message: string;

  constructor(message = 'Logged out successfully') {
    this.message = message;
  }
}

export class TokenValidityDto {
  isValid: boolean;
  expires: Date;
  email?: string;
  message: string;

  constructor(isValid: boolean, expires: Date, message = 'Token is valid', email?: string) {
    this.isValid = isValid;
    this.expires = expires;
    this.email = email;
    this.message = message;
  }
}
