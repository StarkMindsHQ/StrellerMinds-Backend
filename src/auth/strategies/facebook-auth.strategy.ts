import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyFunction } from 'passport-facebook';

@Injectable()
export class FacebookOAuthPassportStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor() {
    super({
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'emails', 'name', 'displayName'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyFunction,
  ): Promise<any> {
    const user = {
      email: profile.emails?.[0].value,
      providerId: profile.id,
      provider: 'facebook',
      displayName: profile.displayName,
    };
    done(null, user);
  }
}
