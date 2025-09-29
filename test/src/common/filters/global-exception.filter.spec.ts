import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionsFilter } from './global-exception.filter';
import { I18nService } from 'nestjs-i18n';
import { ErrorCode } from '../errors/error-codes.enum';
import { CustomException } from '../errors/custom.exception';

describe('GlobalExceptionsFilter', () => {
  let filter: GlobalExceptionsFilter;
  let mockI18nService: Partial<I18nService>;

  beforeEach(async () => {
    mockI18nService = {
      translate: jest.fn().mockImplementation((key: string) => 
        Promise.resolve(`translated-${key}`)
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalExceptionsFilter,
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    filter = module.get<GlobalExceptionsFilter>(GlobalExceptionsFilter);
  });

  const mockArgumentsHost = {
    switchToHttp: () => ({
      getResponse: () => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }),
      getRequest: () => ({
        url: '/test',
        acceptsLanguages: () => 'en',
      }),
    }),
  } as ArgumentsHost;

  it('should handle CustomException', async () => {
    const exception = new CustomException(
      ErrorCode.NOT_FOUND,
      'Resource not found',
      HttpStatus.NOT_FOUND
    );

    await filter.catch(exception, mockArgumentsHost);

    const response = mockArgumentsHost.switchToHttp().getResponse();
    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: ErrorCode.NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: expect.any(String),
        timestamp: expect.any(String),
        path: '/test',
      })
    );
  });

  it('should handle HttpException', async () => {
    const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

    await filter.catch(exception, mockArgumentsHost);

    const response = mockArgumentsHost.switchToHttp().getResponse();
    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: ErrorCode.INTERNAL_ERROR,
        statusCode: HttpStatus.BAD_REQUEST,
        message: expect.any(String),
        timestamp: expect.any(String),
        path: '/test',
      })
    );
  });

  it('should handle unknown errors', async () => {
    const exception = new Error('Unknown error');

    await filter.catch(exception, mockArgumentsHost);

    const response = mockArgumentsHost.switchToHttp().getResponse();
    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: ErrorCode.INTERNAL_ERROR,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: expect.any(String),
        timestamp: expect.any(String),
        path: '/test',
      })
    );
  });

  it('should include stack trace in development environment', async () => {
    process.env.NODE_ENV = 'development';
    const exception = new Error('Test error');
    exception.stack = 'Test stack trace';

    await filter.catch(exception, mockArgumentsHost);

    const response = mockArgumentsHost.switchToHttp().getResponse();
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        stack: 'Test stack trace',
      })
    );
  });

  it('should not include stack trace in production environment', async () => {
    process.env.NODE_ENV = 'production';
    const exception = new Error('Test error');
    exception.stack = 'Test stack trace';

    await filter.catch(exception, mockArgumentsHost);

    const response = mockArgumentsHost.switchToHttp().getResponse();
    expect(response.json).toHaveBeenCalledWith(
      expect.not.objectContaining({
        stack: expect.any(String),
      })
    );
  });
});