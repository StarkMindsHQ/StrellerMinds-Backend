import { scanForSqlInjection } from './sql-injection.util';

describe('sql-injection.util', () => {
  it('detects obvious SQL injection patterns', () => {
    const hit = scanForSqlInjection({ q: "1' OR 1=1 --" });
    expect(hit).not.toBeNull();
    expect(hit?.path).toBe('q');
  });

  it('respects skipKeys', () => {
    const hit = scanForSqlInjection({ password: "abc' OR 1=1 --" }, { skipKeys: ['password'] });
    expect(hit).toBeNull();
  });
});
