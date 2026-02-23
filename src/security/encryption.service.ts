import crypto from "crypto";

const algorithm = "aes-256-gcm";
const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");

export class EncryptionService {
  static encrypt(text: string) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(text, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString("hex"),
      content: encrypted.toString("hex"),
      tag: authTag.toString("hex"),
    };
  }

  static decrypt(encryptedData: any) {
    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(encryptedData.iv, "hex")
    );

    decipher.setAuthTag(Buffer.from(encryptedData.tag, "hex"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData.content, "hex")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  }
}