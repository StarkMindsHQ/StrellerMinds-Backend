import { Controller, Post, Body, Get, Param, UseInterceptors } from '@nestjs/common';
import { TracingInterceptor } from './tracing.interceptor';
import { TracingService } from './tracing.service';
import { TracedHttpService } from './traced-http.service';
import { TracedDatabaseService } from './traced-database.service';
import { Trace, TraceDatabase, TraceExternalService } from './tracing.decorators';

/**
 * Example controller showing comprehensive tracing integration
 * This demonstrates how to use all tracing features in a real controller
 */
@Controller('example')
@UseInterceptors(TracingInterceptor)
export class ExampleIntegrationController {
  constructor(
    private readonly tracingService: TracingService,
    private readonly tracedHttpService: TracedHttpService,
    private readonly tracedDatabaseService: TracedDatabaseService,
  ) {}

  /**
   * Example endpoint showing complex operation with multiple traced steps
   */
  @Post('complex-operation')
  @Trace({ name: 'complex-operation', includeArgs: true, includeResult: true })
  async complexOperation(@Body() data: any) {
    return this.tracingService.withSpan(
      'example.complexOperation',
      async (span) => {
        span.setAttributes({
          'operation.type': 'complex_business_logic',
          'operation.data_size': JSON.stringify(data).length,
          'user.id': data.userId || 'anonymous',
        });

        try {
          // Step 1: Validate input data
          await this.validateInputData(data, span);

          // Step 2: Process with external service
          const externalResult = await this.processWithExternalService(data, span);

          // Step 3: Save to database
          const dbResult = await this.saveToDatabase(data, externalResult, span);

          // Step 4: Send notification
          await this.sendNotification(dbResult, span);

          span.setAttributes({
            'operation.success': true,
            'operation.external_service_result': externalResult.success,
            'operation.database_saved': dbResult.saved,
          });

          this.tracingService.addEvent('operation_completed', {
            result_id: dbResult.id,
            processing_time: Date.now(),
          });

          return {
            success: true,
            resultId: dbResult.id,
            externalServiceResult: externalResult,
          };
        } catch (error) {
          span.setAttributes({
            'operation.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          this.tracingService.recordException(error, {
            'operation.step': 'complex_operation',
            'operation.data': JSON.stringify(data),
          });

          throw error;
        }
      },
      {
        'service.name': 'example-service',
        'operation.type': 'complex_operation',
      },
    );
  }

  /**
   * Example endpoint showing database tracing
   */
  @Get('users/:id')
  @TraceDatabase('select', 'users')
  async getUserById(@Param('id') id: string) {
    return this.tracingService.withSpan(
      'example.getUserById',
      async (span) => {
        span.setAttributes({
          'user.id': id,
          'operation.type': 'user_lookup',
        });

        try {
          const user = await this.tracedDatabaseService.query(
            'SELECT * FROM users WHERE id = $1',
            [id],
            {
              table: 'users',
              operation: 'select',
              includeParams: true,
              includeResult: true,
            },
          );

          if (!user || user.length === 0) {
            span.setAttributes({
              'user.found': false,
              'operation.success': true,
            });
            return { found: false };
          }

          span.setAttributes({
            'user.found': true,
            'user.email': user[0].email,
            'user.created_at': user[0].created_at,
            'operation.success': true,
          });

          return { found: true, user: user[0] };
        } catch (error) {
          span.setAttributes({
            'operation.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          throw error;
        }
      },
      {
        'db.table': 'users',
        'db.operation': 'select',
      },
    );
  }

  /**
   * Example endpoint showing external service tracing
   */
  @Post('external-api-call')
  @TraceExternalService('example-api', 'processData')
  async callExternalApi(@Body() requestData: any) {
    return this.tracingService.withSpan(
      'example.callExternalApi',
      async (span) => {
        span.setAttributes({
          'external.api.name': 'example-api',
          'external.api.endpoint': '/process-data',
          'request.data_size': JSON.stringify(requestData).length,
        });

        try {
          const response = await this.tracedHttpService.post(
            'https://api.example.com/process-data',
            requestData,
            {
              serviceName: 'example-api',
              operation: 'processData',
              includeRequestBody: true,
              includeResponseBody: true,
            },
          );

          span.setAttributes({
            'external.api.response.status': response.status,
            'external.api.response.size': JSON.stringify(response.data).length,
            'external.api.success': true,
          });

          return {
            success: true,
            data: response.data,
            statusCode: response.status,
          };
        } catch (error) {
          span.setAttributes({
            'external.api.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          if (error.response) {
            span.setAttributes({
              'external.api.error.status': error.response.status,
              'external.api.error.data': JSON.stringify(error.response.data),
            });
          }

          throw error;
        }
      },
      {
        'service.name': 'example-api',
        'service.operation': 'processData',
      },
    );
  }

  /**
   * Example endpoint showing blockchain operation tracing
   */
  @Post('blockchain-operation')
  async blockchainOperation(@Body() operationData: any) {
    return this.tracingService.withSpan(
      'example.blockchainOperation',
      async (span) => {
        span.setAttributes({
          'blockchain.name': 'stellar',
          'blockchain.operation': 'transaction',
          'blockchain.amount': operationData.amount,
          'blockchain.currency': operationData.currency,
        });

        try {
          // Simulate blockchain transaction
          const transactionHash = await this.simulateBlockchainTransaction(operationData, span);

          span.setAttributes({
            'blockchain.transaction.hash': transactionHash,
            'blockchain.transaction.success': true,
          });

          this.tracingService.addEvent('blockchain_transaction_completed', {
            transaction_hash: transactionHash,
            amount: operationData.amount,
          });

          return {
            success: true,
            transactionHash,
          };
        } catch (error) {
          span.setAttributes({
            'blockchain.transaction.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          throw error;
        }
      },
      {
        'blockchain.name': 'stellar',
        'blockchain.operation': 'transaction',
      },
    );
  }

  // Private helper methods with tracing

  private async validateInputData(data: any, parentSpan: any) {
    return this.tracingService.withSpan(
      'example.validateInputData',
      async (span) => {
        span.setAttributes({
          'validation.data_size': JSON.stringify(data).length,
          'validation.fields_count': Object.keys(data).length,
        });

        // Simulate validation
        await new Promise((resolve) => setTimeout(resolve, 50));

        span.setAttributes({
          'validation.success': true,
          'validation.duration_ms': 50,
        });

        return { valid: true };
      },
      {
        'operation.type': 'validation',
      },
    );
  }

  private async processWithExternalService(data: any, parentSpan: any) {
    return this.tracingService.withSpan(
      'example.processWithExternalService',
      async (span) => {
        span.setAttributes({
          'external.service': 'processing-service',
          'external.operation': 'process_data',
        });

        try {
          const response = await this.tracedHttpService.post(
            'https://processing-service.example.com/process',
            data,
            {
              serviceName: 'processing-service',
              operation: 'process_data',
            },
          );

          span.setAttributes({
            'external.service.success': true,
            'external.service.response_size': JSON.stringify(response.data).length,
          });

          return { success: true, data: response.data };
        } catch (error) {
          span.setAttributes({
            'external.service.success': false,
            'error.name': error.name,
          });

          throw error;
        }
      },
      {
        'service.name': 'processing-service',
        'service.operation': 'process_data',
      },
    );
  }

  private async saveToDatabase(data: any, externalResult: any, parentSpan: any) {
    return this.tracingService.withSpan(
      'example.saveToDatabase',
      async (span) => {
        span.setAttributes({
          'db.table': 'processed_data',
          'db.operation': 'insert',
        });

        try {
          const result = await this.tracedDatabaseService.query(
            'INSERT INTO processed_data (data, external_result, created_at) VALUES ($1, $2, NOW()) RETURNING id',
            [JSON.stringify(data), JSON.stringify(externalResult)],
            {
              table: 'processed_data',
              operation: 'insert',
              includeParams: true,
              includeResult: true,
            },
          );

          span.setAttributes({
            'db.operation.success': true,
            'db.record.id': result[0].id,
          });

          return { saved: true, id: result[0].id };
        } catch (error) {
          span.setAttributes({
            'db.operation.success': false,
            'error.name': error.name,
          });

          throw error;
        }
      },
      {
        'db.table': 'processed_data',
        'db.operation': 'insert',
      },
    );
  }

  private async sendNotification(dbResult: any, parentSpan: any) {
    return this.tracingService.withSpan(
      'example.sendNotification',
      async (span) => {
        span.setAttributes({
          'notification.type': 'operation_complete',
          'notification.recipient': 'user',
        });

        // Simulate notification sending
        await new Promise((resolve) => setTimeout(resolve, 100));

        span.setAttributes({
          'notification.sent': true,
          'notification.duration_ms': 100,
        });

        return { sent: true };
      },
      {
        'notification.type': 'operation_complete',
      },
    );
  }

  private async simulateBlockchainTransaction(data: any, parentSpan: any) {
    return this.tracingService.withSpan(
      'example.simulateBlockchainTransaction',
      async (span) => {
        span.setAttributes({
          'blockchain.network': 'testnet',
          'blockchain.transaction.type': 'payment',
        });

        // Simulate blockchain transaction
        await new Promise((resolve) => setTimeout(resolve, 200));

        const transactionHash = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        span.setAttributes({
          'blockchain.transaction.confirmed': true,
          'blockchain.transaction.fee': '0.00001',
        });

        return transactionHash;
      },
      {
        'blockchain.name': 'stellar',
        'blockchain.operation': 'simulate_transaction',
      },
    );
  }
}
