import { Injectable } from '@nestjs/common';
import { IAuthStrategy } from '../strategies/auth-strategy.interface';

@Injectable()
export class GoogleOAuthAdapter implements IAuthStrategy {
  name = 'google';

  async validate(credentials: any): Promise<any> {
    return credentials;
  }

  async login(user: any): Promise<any> {
    return user;
  }

  async register?(credentials: any): Promise<any> {
    return credentials;
  }
}
