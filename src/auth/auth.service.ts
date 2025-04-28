// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && user.password === password) {
      const { password, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }), // optional
    };
  }

  async refreshToken(userId: string, refreshToken: string) {
    try {
      // Decode without verifying (e.g., to extract payload)
      const decoded = this.jwtService.verify(refreshToken);
      if (decoded.sub !== userId) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.login(user);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
