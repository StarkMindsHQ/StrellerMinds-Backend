import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  async signAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): Promise<string> {
    return this.jwtService.signAsync(
      { ...payload, type: 'access' },
      {
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
        secret: this.configService.get<string>('JWT_SECRET'),
      },
    );
  }

  async signRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): Promise<string> {
    return this.jwtService.signAsync(
      { ...payload, type: 'refresh' },
      {
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      },
    );
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });
  }

  async signEmailVerificationToken(payload: { email: string }): Promise<string> {
    return this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>('JWT_EMAIL_EXPIRES_IN', '24h'),
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }

  async verifyEmailVerificationToken(token: string): Promise<{ email: string }> {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }

  async signPasswordResetToken(payload: { email: string }): Promise<string> {
    return this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>('JWT_PASSWORD_RESET_EXPIRES_IN', '1h'),
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }

  async verifyPasswordResetToken(token: string): Promise<{ email: string }> {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }

  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer') {
      return null;
    }

    return token;
  }
}
