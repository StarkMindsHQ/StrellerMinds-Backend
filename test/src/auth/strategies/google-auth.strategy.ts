import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
@Injectable()
export class GoogleOAuthPassportStrategy extends PassportStrategy(
  Strategy,
  'google',
) {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const user = {
      email: profile.emails[0].value,
      providerId: profile.id,
      provider: 'google',
      displayName: profile.displayName,
    };
    done(null, user);
  }
}
