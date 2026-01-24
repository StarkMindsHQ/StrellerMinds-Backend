import { Test } from '@nestjs/testing';
import { CorrelationIdMiddleware } from '../../../../src/common/middleware/correlation-id.middleware';
import { LoggerService } from '../../../../src/common/logging/logger.service';
describe('CorrelationIdMiddleware', () => {
    let middleware;
    let loggerService;
    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                CorrelationIdMiddleware,
                {
                    provide: LoggerService,
                    useValue: {
                        setContext: jest.fn(),
                        logRequest: jest.fn(),
                    },
                },
            ],
        }).compile();
        middleware = module.get(CorrelationIdMiddleware);
        loggerService = module.get(LoggerService);
    });
    it('should be defined', () => {
        expect(middleware).toBeDefined();
    });
    describe('use', () => {
        let mockRequest;
        let mockResponse;
        let mockNext;
        beforeEach(() => {
            mockRequest = {
                headers: {},
            };
            mockResponse = {
                setHeader: jest.fn(),
            };
            mockNext = jest.fn();
            // Add correlationId property to request
            Object.defineProperty(mockRequest, 'correlationId', {
                writable: true,
                value: undefined,
            });
        });
        it('should generate a new correlation ID when not provided', () => {
            middleware.use(mockRequest, mockResponse, mockNext);
            expect(mockRequest.headers['x-correlation-id']).toBeDefined();
            expect(mockRequest.correlationId).toBeDefined();
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', mockRequest.headers['x-correlation-id']);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should use existing correlation ID when provided', () => {
            const existingCorrelationId = 'existing-correlation-id';
            mockRequest.headers['x-correlation-id'] = existingCorrelationId;
            middleware.use(mockRequest, mockResponse, mockNext);
            expect(mockRequest.headers['x-correlation-id']).toBe(existingCorrelationId);
            expect(mockRequest.correlationId).toBe(existingCorrelationId);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', existingCorrelationId);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should log the incoming request with correlation ID', () => {
            middleware.use(mockRequest, mockResponse, mockNext);
            expect(loggerService.logRequest).toHaveBeenCalledWith('Incoming Request', expect.objectContaining({
                correlationId: mockRequest.headers['x-correlation-id'],
                method: undefined,
                url: undefined,
                ip: undefined,
                userAgent: undefined,
                timestamp: expect.any(String),
            }));
        });
    });
});
