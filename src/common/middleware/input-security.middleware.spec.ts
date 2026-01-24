import { BadRequestException } from '@nestjs/common';
import { InputSecurityMiddleware } from './input-security.middleware';

describe('InputSecurityMiddleware', () => {
  it('throws on forbidden keys', () => {
    const mw = new InputSecurityMiddleware();
    const mockReq = {
      // Use JSON.parse to emulate real request payloads. Object literals treat `__proto__`
      // specially and won't create an own enumerable "__proto__" key.
      body: JSON.parse('{"__proto__":{"polluted":true},"ok":"yes"}'),
      query: {},
      params: {},
    } as any;
    const mockRes = {} as any;
    const mockNext = jest.fn();

    expect(() => {
      mw.use(mockReq, mockRes, mockNext);
    }).toThrow(BadRequestException);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
