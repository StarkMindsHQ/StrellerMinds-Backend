import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto, RegisterDto, LoginDtoV2, RegisterDtoV2 } from '../dto';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async loginV1(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      access_token: this.jwtService.sign({ userId: user.id, email: user.email }),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async loginV2(loginDto: LoginDtoV2) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.mfaEnabled && !loginDto.mfaCode) {
      return {
        requiresMfa: true,
        temporaryToken: this.jwtService.sign({ userId: user.id, type: 'mfa' }, { expiresIn: '5m' }),
      };
    }

    if (user.mfaEnabled && loginDto.mfaCode) {
      const isValidMfa = await this.validateMfaCode(user.id, loginDto.mfaCode);
      if (!isValidMfa) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    const accessToken = this.jwtService.sign(
      { userId: user.id, email: user.email, role: user.role },
      { expiresIn: loginDto.rememberMe ? '30d' : '1h' },
    );

    const refreshToken = this.jwtService.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '7d' },
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: loginDto.rememberMe ? 2592000 : 3600,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        stellarAddress: user.stellarAddress,
        mfaEnabled: user.mfaEnabled,
      },
    };
  }

  async registerV1(registerDto: RegisterDto) {
    const existingUser = await this.findUserByEmail(registerDto.email);
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    const user = await this.createUser({
      ...registerDto,
      role: 'student',
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async registerV2(registerDto: RegisterDtoV2) {
    const existingUser = await this.findUserByEmail(registerDto.email);
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    if (registerDto.stellarAddress) {
      const isValidStellar = await this.validateStellarAddress(registerDto.stellarAddress);
      if (!isValidStellar) {
        throw new UnauthorizedException('Invalid Stellar address');
      }
    }

    const user = await this.createUser(registerDto);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      stellarAddress: user.stellarAddress,
      emailVerificationRequired: true,
    };
  }

  private async validateUser(email: string, password: string): Promise<any> {
    return null;
  }

  private async validateMfaCode(userId: string, code: string): Promise<boolean> {
    return true;
  }

  private async findUserByEmail(email: string): Promise<any> {
    return null;
  }

  private async createUser(userData: any): Promise<any> {
    return { id: '1', ...userData };
  }

  private async validateStellarAddress(address: string): Promise<boolean> {
    return true;
  }
}
