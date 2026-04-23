import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async login(email: string, password: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }
    return { message: 'Login successful', user };
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) {
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('Email already in use');
    }
    // TODO: Hash password before storing
    const user = this.userRepository.create({
      email,
      password,
      firstName,
      lastName,
    });
    await this.userRepository.save(user);
    return { message: 'Registration successful', user };
  }

  async refreshToken(refreshToken: string) {
    // TODO: Validate and decode JWT token
    return { message: 'Token refreshed', accessToken: 'new-token' };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists for security
      return { message: 'If email exists, reset link sent' };
    }
    // TODO: Generate reset token and send email
    return { message: 'If email exists, reset link sent' };
  }

  async resetPassword(
    email: string,
    resetToken: string,
    newPassword: string,
  ) {
    // TODO: Validate reset token
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }
    // TODO: Hash new password before storing
    user.password = newPassword;
    await this.userRepository.save(user);
    return { message: 'Password reset successful' };
  }

  async verifyEmail(token: string) {
    // TODO: Validate verification token and mark user as verified
    return { message: 'Email verified successfully' };
  }

  async updatePassword(currentPassword: string, newPassword: string) {
    // TODO: Get current user from context
    // TODO: Validate current password
    // TODO: Hash new password before storing
    return { message: 'Password updated successfully' };
  }
}
