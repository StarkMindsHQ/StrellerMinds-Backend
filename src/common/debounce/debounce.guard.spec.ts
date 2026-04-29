import { Reflector } from '@nestjs/core';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { DebounceGuard } from './debounce.guard';
import { DEBOUNCE_KEY } from './debounce.decorator';

function makeContext(ip = '1.2.3.4', options?: { windowMs: number; keyBy: 'ip' | 'user' }) {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(options);
  const guard = new DebounceGuard(reflector);
  const ctx = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', route: { path: '/test' }, ip, user: null }),
    }),
  } as unknown as ExecutionContext;
  return { guard, ctx };
}

describe('DebounceGuard', () => {
  it('allows request when no debounce metadata', () => {
    const { guard, ctx } = makeContext('1.2.3.4', undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows first request within window', () => {
    const { guard, ctx } = makeContext('1.2.3.4', { windowMs: 1000, keyBy: 'ip' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('blocks second request within window', () => {
    const { guard, ctx } = makeContext('1.2.3.4', { windowMs: 5000, keyBy: 'ip' });
    guard.canActivate(ctx);
    expect(() => guard.canActivate(ctx)).toThrow(HttpException);
  });
});
