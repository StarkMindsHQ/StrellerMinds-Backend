import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

@Injectable()
export class TwoFactorAuthService {
    constructor(private readonly configService: ConfigService) { }

    public generateTwoFactorAuthenticationSecret(user: User) {
        const secret = speakeasy.generateSecret({
            name: `StrellerMinds (${user.email})`,
            issuer: 'StrellerMinds',
        });

        return {
            secret: secret.base32,
            otpauthUrl: secret.otpauth_url,
        };
    }

    public async generateQrCodeDataURL(otpAuthUrl: string) {
        return qrcode.toDataURL(otpAuthUrl);
    }

    public isTwoFactorAuthenticationCodeValid(
        twoFactorAuthenticationCode: string,
        user: User,
    ) {
        return speakeasy.totp.verify({
            secret: user.twoFactorAuthenticationSecret,
            encoding: 'base32',
            token: twoFactorAuthenticationCode,
        });
    }
}
