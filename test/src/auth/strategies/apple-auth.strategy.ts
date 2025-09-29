import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import AppleStrategy from 'passport-apple';

@Injectable()
export class AppleOAuthPassportStrategy extends PassportStrategy(
  AppleStrategy,
  'apple',
) {
  constructor() {
    super({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      callbackURL: process.env.APPLE_CALLBACK_URL,
      keyID: process.env.APPLE_KEY_ID,
      privateKeyString: process.env.APPLE_PRIVATE_KEY,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any,
    done: Function,
  ): Promise<any> {
    const user = {
      email: profile?.email,
      providerId: profile?.sub,
      provider: 'apple',
      displayName: profile?.name || 'Apple User',
    };
    done(null, user);
  }
}
