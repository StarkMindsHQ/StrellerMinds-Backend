import { Test, TestingModule } from '@nestjs/testing';
import { StreamingResponseInterceptor } from './streaming-response.interceptor';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { STREAM_RESPONSE } from '../decorators/stream-response.decorator';

describe('StreamingResponseInterceptor', () => {
  let interceptor: StreamingResponseInterceptor;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamingResponseInterceptor,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<StreamingResponseInterceptor>(StreamingResponseInterceptor);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should set streaming headers when stream metadata is present', () => {
    const mockResponse = {
      setHeader: jest.fn(),
    };

    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    const mockHandler = {} as CallHandler;

    // Mock reflector to return stream options
    jest.spyOn(reflector, 'get').mockReturnValue({ contentType: 'application/json' });

    interceptor.intercept(mockContext, mockHandler);

    expect(mockResponse.setHeader).toHaveBeenCalledWith('Transfer-Encoding', 'chunked');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
  });

  it('should not set streaming headers when no stream metadata is present', () => {
    const mockResponse = {
      setHeader: jest.fn(),
    };

    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    const mockHandler = {} as CallHandler;

    // Mock reflector to return undefined (no streaming)
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);

    interceptor.intercept(mockContext, mockHandler);

    expect(mockResponse.setHeader).not.toHaveBeenCalled();
  });
});
