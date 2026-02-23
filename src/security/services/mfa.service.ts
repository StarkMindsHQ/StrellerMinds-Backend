import speakeasy from "speakeasy";
import QRCode from "qrcode";

export class MFAService {
  static async generateSecret(userEmail: string) {
    const secret = speakeasy.generateSecret({
      name: `YourApp (${userEmail})`,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      base32: secret.base32,
      qrCode,
    };
  }

  static verifyToken(secret: string, token: string) {
    return speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1,
    });
  }
}