import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/services/users.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (request, rawJwtToken, done) => {
        const currentSecret = configService.get<string>('JWT_SECRET');
        const secrets = (configService.get<string>('JWT_SECRETS') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        for (const secret of [currentSecret, ...secrets]) {
          try {
            done(null, secret);
            return;
          } catch {}
        }
        done(new Error('Invalid JWT secret'));
      },
    });
  }

  async validate(payload: { sub: string; email: string; roles: string[] }): Promise<any> {
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };
  }
}
