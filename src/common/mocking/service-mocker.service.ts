import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service Mocking Framework
 *
 * Provides comprehensive mocking capabilities for external service integrations.
 * Enables realistic testing without external dependencies.
 *
 * Business Rules:
 * 1. Mocks simulate real service behavior
 * 2. Configurable response patterns
 * 3. Error scenario simulation
 * 4. Performance testing capabilities
 * 5. Contract validation support
 *
 * Mock Features:
 * - Request/response matching
 * - Dynamic response generation
 * - Error injection
 * - Latency simulation
 * - State management
 */

export interface MockConfig {
  enabled: boolean;
  latency: {
    min: number;
    max: number;
  };
  errorRate: number;
  responses: MockResponse[];
}

export interface MockResponse {
  condition: (request: any) => boolean;
  response: any | ((request: any) => any);
  status?: number;
  delay?: number;
  error?: boolean;
}

export interface MockState {
  name: string;
  data: Record<string, any>;
  history: Array<{
    timestamp: number;
    request: any;
    response: any;
  }>;
}

export interface ServiceMock {
  serviceName: string;
  config: MockConfig;
  state: MockState;
  isActive: boolean;
}

@Injectable()
export class ServiceMockerService {
  private readonly logger = new Logger(ServiceMockerService.name);
  private readonly mocks = new Map<string, ServiceMock>();
  private readonly globalConfig = {
    enabled: this.configService.get('MOCK_SERVICES_ENABLED', false),
    defaultLatency: {
      min: this.configService.get('MOCK_DEFAULT_LATENCY_MIN', 50),
      max: this.configService.get('MOCK_DEFAULT_LATENCY_MAX', 200),
    },
    defaultErrorRate: this.configService.get('MOCK_DEFAULT_ERROR_RATE', 0.05),
  };

  constructor(private configService: ConfigService) {}

  /**
   * Register a mock for a service
   *
   * @param serviceName - Name of the service to mock
   * @param config - Mock configuration
   * @returns Registered mock instance
   */
  registerMock(serviceName: string, config: Partial<MockConfig> = {}): ServiceMock {
    const mock: ServiceMock = {
      serviceName,
      config: {
        enabled: config.enabled ?? this.globalConfig.enabled,
        latency: config.latency ?? this.globalConfig.defaultLatency,
        errorRate: config.errorRate ?? this.globalConfig.defaultErrorRate,
        responses: config.responses ?? [],
      },
      state: {
        name: serviceName,
        data: {},
        history: [],
      },
      isActive: true,
    };

    this.mocks.set(serviceName, mock);
    this.logger.log(`Mock registered for service: ${serviceName}`);

    return mock;
  }

  /**
   * Execute mock logic for a service call
   *
   * Algorithm:
   * 1. Check if mocking is enabled for service
   * 2. Find matching response configuration
   * 3. Simulate latency if configured
   * 4. Inject errors based on error rate
   * 5. Return mock response
   *
   * @param serviceName - Service name
   * @param request - Request data
   * @returns Mock response
   */
  async executeMock<T>(serviceName: string, request: any): Promise<T> {
    const mock = this.mocks.get(serviceName);

    if (!mock || !mock.isActive || !mock.config.enabled) {
      throw new Error(`No active mock found for service: ${serviceName}`);
    }

    // Record request in history
    mock.state.history.push({
      timestamp: Date.now(),
      request: JSON.parse(JSON.stringify(request)),
      response: null,
    });

    try {
      // Simulate latency
      await this.simulateLatency(mock.config.latency);

      // Check for error injection
      if (this.shouldInjectError(mock.config.errorRate)) {
        const error = this.generateError(serviceName, request);
        throw error;
      }

      // Find matching response
      const response = this.findMatchingResponse(mock, request);

      // Record response in history
      const historyEntry = mock.state.history[mock.state.history.length - 1];
      historyEntry.response = JSON.parse(JSON.stringify(response));

      this.logger.debug(`Mock executed for ${serviceName}`, { request, response });

      return response as T;
    } catch (error) {
      // Record error in history
      const historyEntry = mock.state.history[mock.state.history.length - 1];
      historyEntry.response = { error: error.message };

      this.logger.warn(`Mock error for ${serviceName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find matching response configuration
   *
   * @param mock - Service mock
   * @param request - Request data
   * @returns Matching response or default
   */
  private findMatchingResponse(mock: ServiceMock, request: any): any {
    // Find first matching response
    for (const mockResponse of mock.config.responses) {
      if (mockResponse.condition(request)) {
        if (typeof mockResponse.response === 'function') {
          return mockResponse.response(request);
        }
        return mockResponse.response;
      }
    }

    // Return default response if no match found
    return this.generateDefaultResponse(mock.serviceName, request);
  }

  /**
   * Generate default response for unmatched requests
   *
   * @param serviceName - Service name
   * @param request - Request data
   * @returns Default response
   */
  private generateDefaultResponse(serviceName: string, request: any): any {
    switch (serviceName) {
      case 'stripe':
        return this.generateStripeDefaultResponse(request);
      case 'paypal':
        return this.generatePayPalDefaultResponse(request);
      case 'zoom':
        return this.generateZoomDefaultResponse(request);
      default:
        return {
          id: `mock_${serviceName}_${Date.now()}`,
          status: 'success',
          data: request,
          timestamp: new Date().toISOString(),
        };
    }
  }

  /**
   * Generate default Stripe response
   */
  private generateStripeDefaultResponse(request: any): any {
    const { type, ...requestData } = request;

    switch (type) {
      case 'payment_intent':
        return {
          id: `pi_mock_${Date.now()}`,
          object: 'payment_intent',
          amount: requestData.amount || 2000,
          currency: requestData.currency || 'usd',
          status: 'requires_payment_method',
          created: Math.floor(Date.now() / 1000),
          metadata: requestData.metadata || {},
        };

      case 'customer':
        return {
          id: `cus_mock_${Date.now()}`,
          object: 'customer',
          email: requestData.email || 'mock@example.com',
          name: requestData.name || 'Mock User',
          created: Math.floor(Date.now() / 1000),
          metadata: requestData.metadata || {},
        };

      case 'subscription':
        return {
          id: `sub_mock_${Date.now()}`,
          object: 'subscription',
          status: 'active',
          customer: requestData.customer || `cus_mock_${Date.now()}`,
          created: Math.floor(Date.now() / 1000),
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
        };

      default:
        return {
          id: `mock_${type}_${Date.now()}`,
          object: type,
          status: 'success',
          ...requestData,
        };
    }
  }

  /**
   * Generate default PayPal response
   */
  private generatePayPalDefaultResponse(request: any): any {
    const { operation, ...requestData } = request;

    switch (operation) {
      case 'create_order':
        return {
          id: `ORD-${Date.now()}`,
          status: 'CREATED',
          intent: requestData.intent || 'CAPTURE',
          purchase_units: requestData.purchase_units || [
            {
              amount: {
                currency_code: 'USD',
                value: '20.00',
              },
            },
          ],
          create_time: new Date().toISOString(),
          links: [
            {
              href: 'https://api.sandbox.paypal.com/v2/checkout/orders/mock-id',
              rel: 'self',
              method: 'GET',
            },
          ],
        };

      case 'capture_order':
        return {
          id: requestData.orderId || `ORD-${Date.now()}`,
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: `CAP-${Date.now()}`,
                    status: 'COMPLETED',
                    amount: {
                      currency_code: 'USD',
                      value: '20.00',
                    },
                  },
                ],
              },
            },
          ],
        };

      case 'create_subscription':
        return {
          id: `I-${Date.now()}`,
          status: 'APPROVED',
          plan_id: requestData.plan_id || 'P-MOCK',
          subscriber: requestData.subscriber || {
            name: { given_name: 'Mock', surname: 'User' },
            email_address: 'mock@example.com',
          },
        };

      default:
        return {
          id: `mock_${operation}_${Date.now()}`,
          status: 'success',
          ...requestData,
        };
    }
  }

  /**
   * Generate default Zoom response
   */
  private generateZoomDefaultResponse(request: any): any {
    const { action, ...requestData } = request;

    switch (action) {
      case 'create_meeting':
        return {
          id: `mock_meeting_${Date.now()}`,
          uuid: `mock_uuid_${Date.now()}`,
          topic: requestData.topic || 'Mock Meeting',
          type: requestData.type || 2,
          start_time: requestData.start_time || new Date().toISOString(),
          duration: requestData.duration || 60,
          join_url: `https://zoom.us/j/mock_meeting_${Date.now()}`,
          password: 'mock123',
        };

      case 'get_user':
        return {
          id: requestData.userId || 'mock_user_id',
          email: requestData.email || 'mock@example.com',
          first_name: 'Mock',
          last_name: 'User',
          type: 2,
          pmi: 123456789,
          timezone: 'America/New_York',
        };

      default:
        return {
          id: `mock_${action}_${Date.now()}`,
          status: 'success',
          ...requestData,
        };
    }
  }

  /**
   * Simulate network latency
   *
   * @param latency - Latency configuration
   */
  private async simulateLatency(latency: { min: number; max: number }): Promise<void> {
    const delay = Math.random() * (latency.max - latency.min) + latency.min;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Determine if error should be injected
   *
   * @param errorRate - Error rate (0-1)
   * @returns True if error should be injected
   */
  private shouldInjectError(errorRate: number): boolean {
    return Math.random() < errorRate;
  }

  /**
   * Generate realistic error
   *
   * @param serviceName - Service name
   * @param request - Request data
   * @returns Error object
   */
  private generateError(serviceName: string, request: any): Error {
    const errors = [
      new Error('Network timeout'),
      new Error('Service unavailable'),
      new Error('Rate limit exceeded'),
      new Error('Invalid request'),
      new Error('Authentication failed'),
    ];

    const error = errors[Math.floor(Math.random() * errors.length)];

    // Add service-specific context
    error.message = `${serviceName}: ${error.message}`;

    return error;
  }

  /**
   * Get mock state for a service
   *
   * @param serviceName - Service name
   * @returns Mock state
   */
  getMockState(serviceName: string): MockState | null {
    const mock = this.mocks.get(serviceName);
    return mock ? mock.state : null;
  }

  /**
   * Update mock state data
   *
   * @param serviceName - Service name
   * @param data - Data to update
   */
  updateMockState(serviceName: string, data: Record<string, any>): void {
    const mock = this.mocks.get(serviceName);
    if (mock) {
      mock.state.data = { ...mock.state.data, ...data };
    }
  }

  /**
   * Get mock history for a service
   *
   * @param serviceName - Service name
   * @param limit - Number of recent entries to return
   * @returns Mock history
   */
  getMockHistory(
    serviceName: string,
    limit: number = 100,
  ): Array<{
    timestamp: number;
    request: any;
    response: any;
  }> {
    const mock = this.mocks.get(serviceName);
    if (!mock) return [];

    return mock.state.history.slice(-limit);
  }

  /**
   * Clear mock history for a service
   *
   * @param serviceName - Service name
   */
  clearMockHistory(serviceName: string): void {
    const mock = this.mocks.get(serviceName);
    if (mock) {
      mock.state.history = [];
    }
  }

  /**
   * Activate or deactivate a mock
   *
   * @param serviceName - Service name
   * @param active - Whether mock should be active
   */
  setMockActive(serviceName: string, active: boolean): void {
    const mock = this.mocks.get(serviceName);
    if (mock) {
      mock.isActive = active;
      this.logger.log(`Mock ${serviceName} ${active ? 'activated' : 'deactivated'}`);
    }
  }

  /**
   * Get all registered mocks
   *
   * @returns Map of all mocks
   */
  getAllMocks(): Map<string, ServiceMock> {
    return new Map(this.mocks);
  }

  /**
   * Reset all mocks
   */
  resetAllMocks(): void {
    for (const mock of this.mocks.values()) {
      mock.state.data = {};
      mock.state.history = [];
      mock.isActive = true;
    }
    this.logger.log('All mocks reset');
  }

  /**
   * Create predefined mock configurations
   *
   * @param serviceName - Service name
   * @returns Preconfigured mock
   */
  createPredefinedMock(serviceName: string): ServiceMock {
    const configs = {
      stripe: this.createStripeMockConfig(),
      paypal: this.createPayPalMockConfig(),
      zoom: this.createZoomMockConfig(),
    };

    const config = configs[serviceName];
    if (!config) {
      throw new Error(`No predefined mock configuration for service: ${serviceName}`);
    }

    return this.registerMock(serviceName, config);
  }

  /**
   * Create Stripe mock configuration
   */
  private createStripeMockConfig(): MockConfig {
    return {
      enabled: true,
      latency: { min: 100, max: 500 },
      errorRate: 0.02,
      responses: [
        {
          condition: (request) => request.type === 'payment_intent',
          response: (request) => this.generateStripeDefaultResponse(request),
        },
        {
          condition: (request) => request.type === 'customer',
          response: (request) => this.generateStripeDefaultResponse(request),
        },
        {
          condition: (request) => request.type === 'subscription',
          response: (request) => this.generateStripeDefaultResponse(request),
        },
      ],
    };
  }

  /**
   * Create PayPal mock configuration
   */
  private createPayPalMockConfig(): MockConfig {
    return {
      enabled: true,
      latency: { min: 150, max: 600 },
      errorRate: 0.03,
      responses: [
        {
          condition: (request) => request.operation === 'create_order',
          response: (request) => this.generatePayPalDefaultResponse(request),
        },
        {
          condition: (request) => request.operation === 'capture_order',
          response: (request) => this.generatePayPalDefaultResponse(request),
        },
        {
          condition: (request) => request.operation === 'create_subscription',
          response: (request) => this.generatePayPalDefaultResponse(request),
        },
      ],
    };
  }

  /**
   * Create Zoom mock configuration
   */
  private createZoomMockConfig(): MockConfig {
    return {
      enabled: true,
      latency: { min: 80, max: 300 },
      errorRate: 0.01,
      responses: [
        {
          condition: (request) => request.action === 'create_meeting',
          response: (request) => this.generateZoomDefaultResponse(request),
        },
        {
          condition: (request) => request.action === 'get_user',
          response: (request) => this.generateZoomDefaultResponse(request),
        },
      ],
    };
  }

  /**
   * Validate mock responses against contracts
   *
   * @param serviceName - Service name
   * @param contract - Expected contract structure
   * @returns Validation result
   */
  validateMockContract(
    serviceName: string,
    contract: any,
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const mock = this.mocks.get(serviceName);
    if (!mock) {
      return {
        isValid: false,
        errors: [`No mock found for service: ${serviceName}`],
      };
    }

    const errors: string[] = [];

    // Validate response structures
    for (const mockResponse of mock.config.responses) {
      try {
        const testRequest = this.generateTestRequest(serviceName);
        const response =
          typeof mockResponse.response === 'function'
            ? mockResponse.response(testRequest)
            : mockResponse.response;

        // Basic structure validation
        if (!response || typeof response !== 'object') {
          errors.push(`Invalid response structure for ${serviceName}`);
          continue;
        }

        // Service-specific validation
        this.validateResponseStructure(serviceName, response, errors);
      } catch (error) {
        errors.push(`Response validation error: ${error.message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate test request for validation
   */
  private generateTestRequest(serviceName: string): any {
    switch (serviceName) {
      case 'stripe':
        return { type: 'payment_intent', amount: 2000, currency: 'usd' };
      case 'paypal':
        return { operation: 'create_order', intent: 'CAPTURE' };
      case 'zoom':
        return { action: 'create_meeting', topic: 'Test Meeting' };
      default:
        return { test: true };
    }
  }

  /**
   * Validate response structure
   */
  private validateResponseStructure(serviceName: string, response: any, errors: string[]): void {
    switch (serviceName) {
      case 'stripe':
        if (!response.id || typeof response.id !== 'string') {
          errors.push('Stripe response missing valid id field');
        }
        if (!response.object || typeof response.object !== 'string') {
          errors.push('Stripe response missing valid object field');
        }
        break;

      case 'paypal':
        if (!response.id || typeof response.id !== 'string') {
          errors.push('PayPal response missing valid id field');
        }
        if (!response.status || typeof response.status !== 'string') {
          errors.push('PayPal response missing valid status field');
        }
        break;

      case 'zoom':
        if (!response.id && !response.uuid) {
          errors.push('Zoom response missing id or uuid field');
        }
        break;
    }
  }
}
