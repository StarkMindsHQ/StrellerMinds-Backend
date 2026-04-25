import { ValueTransformer } from 'typeorm';
import { EncryptionService } from './encryption.service';

/**
 * TypeORM transformer for encrypting/decrypting data at rest.
 */
export class EncryptionTransformer implements ValueTransformer {
  /**
   * Called when saving to the database.
   */
  to(value: any): string | null {
    if (value === null || value === undefined) return value;
    const service = EncryptionService.getInstance();
    if (!service) return value;

    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    return service.encrypt(stringValue);
  }

  /**
   * Called when reading from the database.
   */
  from(value: string | null): any {
    if (!value) return value;
    const service = EncryptionService.getInstance();
    if (!service) return value;

    const decrypted = service.decrypt(value);
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }
}

/**
 * Singleton instance of the transformer for use in entities.
 */
export const encryptionTransformer = new EncryptionTransformer();
