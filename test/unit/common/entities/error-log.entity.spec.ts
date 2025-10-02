// Declare global test functions to avoid TypeScript errors
declare const describe: (name: string, callback: () => void) => void;
declare const it: (name: string, callback: () => void) => void;
declare const expect: (value: any) => any;

import { ErrorLog } from '../../../../src/common/entities/error-log.entity';

describe('ErrorLog', () => {
  it('should be defined', () => {
    expect(new ErrorLog()).toBeDefined();
  });

  it('should have correct properties', () => {
    const errorLog = new ErrorLog();

    // Test that all properties exist
    expect(errorLog).toHaveProperty('id');
    expect(errorLog).toHaveProperty('correlationId');
    expect(errorLog).toHaveProperty('errorCode');
    expect(errorLog).toHaveProperty('errorMessage');
    expect(errorLog).toHaveProperty('statusCode');
    expect(errorLog).toHaveProperty('endpoint');
    expect(errorLog).toHaveProperty('method');
    expect(errorLog).toHaveProperty('userId');
    expect(errorLog).toHaveProperty('userAgent');
    expect(errorLog).toHaveProperty('ip');
    expect(errorLog).toHaveProperty('stackTrace');
    expect(errorLog).toHaveProperty('context');
    expect(errorLog).toHaveProperty('severity');
    expect(errorLog).toHaveProperty('category');
    expect(errorLog).toHaveProperty('timestamp');
  });

  it('should have correct default values', () => {
    const errorLog = new ErrorLog();

    // Test default values
    expect(errorLog.severity).toBe('medium');
    expect(errorLog.category).toBe('UNKNOWN');
  });

  it('should accept assigned values', () => {
    const errorLog = new ErrorLog();

    // Assign values
    errorLog.id = 'test-id';
    errorLog.correlationId = 'test-correlation-id';
    errorLog.errorCode = 'INTERNAL_ERROR';
    errorLog.errorMessage = 'Test error message';
    errorLog.statusCode = 500;
    errorLog.endpoint = '/api/test';
    errorLog.method = 'GET';
    errorLog.userId = 'test-user-id';
    errorLog.userAgent = 'test-user-agent';
    errorLog.ip = '127.0.0.1';
    errorLog.stackTrace = 'Error: Test error';
    errorLog.context = { test: 'context' };
    errorLog.severity = 'critical';
    errorLog.category = 'SYSTEM';

    // Test assigned values
    expect(errorLog.id).toBe('test-id');
    expect(errorLog.correlationId).toBe('test-correlation-id');
    expect(errorLog.errorCode).toBe('INTERNAL_ERROR');
    expect(errorLog.errorMessage).toBe('Test error message');
    expect(errorLog.statusCode).toBe(500);
    expect(errorLog.endpoint).toBe('/api/test');
    expect(errorLog.method).toBe('GET');
    expect(errorLog.userId).toBe('test-user-id');
    expect(errorLog.userAgent).toBe('test-user-agent');
    expect(errorLog.ip).toBe('127.0.0.1');
    expect(errorLog.stackTrace).toBe('Error: Test error');
    expect(errorLog.context).toEqual({ test: 'context' });
    expect(errorLog.severity).toBe('critical');
    expect(errorLog.category).toBe('SYSTEM');
  });
});
