import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

interface ApiKeyEntry {
  createdAt: Date;
  active: boolean;
}

@Injectable()
export class ApiKeyService {
  private readonly keys = new Map<string, ApiKeyEntry>();

  generate(): string {
    const key = `sk_${randomBytes(24).toString('hex')}`;
    this.keys.set(key, { createdAt: new Date(), active: true });
    return key;
  }

  validate(key: string): boolean {
    return this.keys.get(key)?.active === true;
  }

  revoke(key: string): boolean {
    const entry = this.keys.get(key);
    if (!entry) return false;
    entry.active = false;
    return true;
  }

  rotate(oldKey: string): string | null {
    if (!this.revoke(oldKey)) return null;
    return this.generate();
  }
}
