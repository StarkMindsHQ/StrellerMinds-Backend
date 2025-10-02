import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHello(): string {
    return 'Hello World!';
  }

  getJwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET');
  }

  getStellarNetwork(): string {
    return this.configService.get<string>('STELLAR_NETWORK');
  }
}
