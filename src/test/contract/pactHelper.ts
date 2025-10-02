import { Pact } from '@pact-foundation/pact';
import path from 'path';

export function createPact(providerName: string) {
  return new Pact({
    consumer: 'veritix-backend',
    provider: providerName,
    dir: path.resolve(process.cwd(), 'pacts'),
    log: path.resolve(process.cwd(), 'logs', `${providerName}-pact.log`),
    logLevel: 'info',
  });
}
