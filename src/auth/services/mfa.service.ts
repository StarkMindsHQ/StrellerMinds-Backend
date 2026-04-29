import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as speakeasy from 'speakeasy';
import { User } from '../entities/user.entity';

@Injectable()
export class MfaService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /** Generate a new TOTP secret and return the otpauth URI for QR display. */
  async setupMfa(userId: string): Promise<{ otpauthUrl: string; secret: string }> {
    const secret = speakeasy.generateSecret({ name: 'StrellerMinds', length: 20 });

    await this.userRepository.update(userId, { mfaSecret: secret.base32 });

    return { otpauthUrl: secret.otpauth_url!, secret: secret.base32 };
  }

  /** Verify the provided TOTP token and enable MFA on the account. */
  async verifyAndEnable(userId: string, token: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'mfaSecret', 'mfaEnabled'],
    });

    if (!user?.mfaSecret) {
      throw new BadRequestException('MFA setup not initiated');
    }

    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!valid) throw new UnauthorizedException('Invalid TOTP token');

    await this.userRepository.update(userId, { mfaEnabled: true });
  }

  /** Validate a TOTP token during login (throws if invalid). */
  async validateToken(userId: string, token: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'mfaSecret'],
    });

    const valid = speakeasy.totp.verify({
      secret: user?.mfaSecret ?? '',
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!valid) throw new UnauthorizedException('Invalid TOTP token');
  }

  /** Disable MFA after confirming a valid TOTP token. */
  async disable(userId: string, token: string): Promise<void> {
    await this.validateToken(userId, token);
    await this.userRepository.update(userId, { mfaEnabled: false, mfaSecret: '' });
  }
}
