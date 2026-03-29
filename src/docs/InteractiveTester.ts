import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

export interface TestResult {
  status: number;
  data: any;
  headers: any;
  duration: number;
}

@Injectable()
export class InteractiveTester {
  private readonly logger = new Logger(InteractiveTester.name);

  /**
   * Performs an interactive API test for a given endpoint.
   */
  async testEndpoint(
    method: string,
    url: string,
    headers: Record<string, string> = {},
    body?: any,
  ): Promise<TestResult> {
    this.logger.log(`Interactive API test: ${method.toUpperCase()} ${url}`);

    const startTime = Date.now();

    try {
      const response: AxiosResponse = await axios({
        method: method,
        url: url,
        headers: {
          ...headers,
          'X-Interactive-Tester': 'StrellerMinds-Test-Agent',
        },
        data: body,
      });

      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(`API test failed: ${error.message}`);
        
        return {
          status: error.response?.status || 500,
          data: error.response?.data || error.message,
          headers: error.response?.headers || {},
          duration: Date.now() - startTime,
        };
      }

      throw new BadRequestException('Unexpected error during API test execution');
    }
  }

  /**
   * Generates a testing plan for a specific endpoint.
   */
  generateTestingPlan(endpoint: string): string {
    return `Testing plan for endpoint: ${endpoint}\n- Validate authentication\n- Check required parameters\n- Test success and failure scenarios`;
  }
}
