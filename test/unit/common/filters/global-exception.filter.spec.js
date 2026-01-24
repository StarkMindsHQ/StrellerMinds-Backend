import { Test } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CustomException } from '../../../../src/common/errors/custom.exception';
import { ErrorCode } from '../../../../src/common/errors/error-codes.enum';
import { GlobalExceptionsFilter } from '../../../../src/common/filters/global-exception.filter';
import { LoggerService } from '../../../../src/common/logging/logger.service';
import { SentryService } from '../../../../src/common/sentry/sentry.service';
import { AlertingService } from '../../../../src/common/alerting/alerting.service';
import { ErrorDashboardService } from '../../../../src/error-dashboard/error-dashboard.service';
describe('GlobalExceptionsFilter', () => {
    let filter;
    let i18nService;
    let loggerService;
    let sentryService;
    let alertingService;
    let errorDashboardService;
    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                GlobalExceptionsFilter,
                {
                    provide: I18nService,
                    useValue: {
                        translate: jest.fn().mockImplementation((key) => {
                            const translations = {
                                'errors.INTERNAL_ERROR': 'Internal server error',
                                'errors.INVALID_INPUT': 'Invalid input',
                            };
                            return translations[key] || key;
                        }),
                    },
                },
                {
                    provide: LoggerService,
                    useValue: {
                        error: jest.fn(),
                        warn: jest.fn(),
                        fatal: jest.fn(),
                        logResponse: jest.fn(),
                        setContext: jest.fn(),
                    },
                },
                {
                    provide: SentryService,
                    useValue: {
                        captureError: jest.fn(),
                    },
                },
                {
                    provide: AlertingService,
                    useValue: {
                        sendCriticalErrorAlert: jest.fn(),
                    },
                },
                {
                    provide: ErrorDashboardService,
                    useValue: {
                        addErrorLog: jest.fn(),
                    },
                },
            ],
        }).compile();
        filter = module.get(GlobalExceptionsFilter);
        i18nService = module.get(I18nService);
        loggerService = module.get(LoggerService);
        sentryService = module.get(SentryService);
        alertingService = module.get(AlertingService);
        errorDashboardService = module.get(ErrorDashboardService);
    });
    it('should be defined', () => {
        expect(filter).toBeDefined();
    });
    describe('catch', () => {
        let mockResponse;
        let mockRequest;
        let mockHost;
        beforeEach(() => {
            mockResponse = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis(),
                setHeader: jest.fn(),
            };
            mockRequest = {
                acceptsLanguages: jest.fn().mockReturnValue('en'),
                headers: {},
                method: 'GET',
                url: '/test',
                ip: '127.0.0.1',
                get: jest.fn().mockReturnValue('test-user-agent'),
            };
            mockHost = {
                switchToHttp: jest.fn().mockReturnValue({
                    getResponse: jest.fn().mockReturnValue(mockResponse),
                    getRequest: jest.fn().mockReturnValue(mockRequest),
                }),
            };
        });
        it('should handle CustomException', async () => {
            const customException = new CustomException(ErrorCode.INTERNAL_ERROR, 'Test error', HttpStatus.INTERNAL_SERVER_ERROR);
            await filter.catch(customException, mockHost);
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(mockResponse.json).toHaveBeenCalledWith({
                errorCode: ErrorCode.INTERNAL_ERROR,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Internal server error',
                timestamp: expect.any(String),
                path: '/test',
                correlationId: expect.any(String),
            });
            expect(loggerService.error).toHaveBeenCalledWith('Custom Exception', expect.any(Object));
            expect(errorDashboardService.addErrorLog).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: ErrorCode.INTERNAL_ERROR,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            }));
        });
        it('should handle HttpException with validation errors', async () => {
            const httpException = new HttpException({
                message: [
                    {
                        property: 'email',
                        constraints: {
                            isEmail: 'email must be an email',
                        },
                    },
                ],
            }, HttpStatus.BAD_REQUEST);
            await filter.catch(httpException, mockHost);
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(mockResponse.json).toHaveBeenCalledWith({
                errorCode: ErrorCode.INVALID_INPUT,
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'Invalid input',
                details: [
                    {
                        field: 'email',
                        message: 'email must be an email',
                    },
                ],
                timestamp: expect.any(String),
                path: '/test',
                correlationId: expect.any(String),
            });
            expect(loggerService.warn).toHaveBeenCalledWith('Validation Error', expect.any(Object));
            expect(errorDashboardService.addErrorLog).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: ErrorCode.INVALID_INPUT,
                statusCode: HttpStatus.BAD_REQUEST,
            }));
        });
        it('should handle HttpException without validation errors', async () => {
            const httpException = new HttpException('Not Found', HttpStatus.NOT_FOUND);
            await filter.catch(httpException, mockHost);
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
            expect(mockResponse.json).toHaveBeenCalledWith({
                errorCode: ErrorCode.INTERNAL_ERROR,
                statusCode: HttpStatus.NOT_FOUND,
                message: 'Not Found',
                timestamp: expect.any(String),
                path: '/test',
                correlationId: expect.any(String),
            });
            expect(loggerService.error).toHaveBeenCalledWith('HTTP Exception', expect.any(Object));
            expect(errorDashboardService.addErrorLog).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: ErrorCode.INTERNAL_ERROR,
                statusCode: HttpStatus.NOT_FOUND,
            }));
        });
        it('should handle unknown errors', async () => {
            const unknownError = new Error('Unknown error');
            await filter.catch(unknownError, mockHost);
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(mockResponse.json).toHaveBeenCalledWith({
                errorCode: ErrorCode.INTERNAL_ERROR,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Internal server error',
                timestamp: expect.any(String),
                path: '/test',
                correlationId: expect.any(String),
            });
            expect(loggerService.fatal).toHaveBeenCalledWith('Unhandled Exception', expect.any(Object));
            expect(sentryService.captureError).toHaveBeenCalledWith(unknownError, expect.any(Object));
            expect(alertingService.sendCriticalErrorAlert).toHaveBeenCalledWith(unknownError, expect.any(Object));
            expect(errorDashboardService.addErrorLog).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: ErrorCode.INTERNAL_ERROR,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                stackTrace: unknownError.stack,
            }));
        });
        it('should handle non-Error unknown errors', async () => {
            const unknownError = 'Unknown error string';
            await filter.catch(unknownError, mockHost);
            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(mockResponse.json).toHaveBeenCalledWith({
                errorCode: ErrorCode.INTERNAL_ERROR,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Internal server error',
                timestamp: expect.any(String),
                path: '/test',
                correlationId: expect.any(String),
            });
            expect(loggerService.fatal).toHaveBeenCalledWith('Unhandled Exception', expect.any(Object));
            expect(alertingService.sendCriticalErrorAlert).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
            expect(errorDashboardService.addErrorLog).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: ErrorCode.INTERNAL_ERROR,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            }));
        });
        it('should include stack trace in development environment', async () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            const error = new Error('Test error');
            await filter.catch(error, mockHost);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                stack: error.stack,
            }));
            process.env.NODE_ENV = originalEnv;
        });
        it('should not include stack trace in production environment', async () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            const error = new Error('Test error');
            await filter.catch(error, mockHost);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.not.objectContaining({
                stack: expect.anything(),
            }));
            process.env.NODE_ENV = originalEnv;
        });
        it('should use existing correlation ID if provided', async () => {
            const correlationId = 'test-correlation-id';
            mockRequest.headers['x-correlation-id'] = correlationId;
            const error = new Error('Test error');
            await filter.catch(error, mockHost);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', correlationId);
            expect(errorDashboardService.addErrorLog).toHaveBeenCalledWith(expect.objectContaining({
                correlationId,
            }));
        });
    });
});
