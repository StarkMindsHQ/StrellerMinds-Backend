import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Command, CommandHandler, CommandResult } from '../base/command.base';
import { Query, QueryHandler, QueryResult } from '../base/query.base';
import { EventBusService } from '../../events/services/event-bus.service';

export interface CqrsMetrics {
  totalCommandsExecuted: number;
  totalQueriesExecuted: number;
  totalCommandsFailed: number;
  totalQueriesFailed: number;
  commandsByType: Record<string, number>;
  queriesByType: Record<string, number>;
  averageCommandExecutionTime: number;
  averageQueryExecutionTime: number;
}

@Injectable()
export class CqrsBusService {
  private readonly logger = new Logger(CqrsBusService.name);
  private readonly commandHandlers = new Map<string, any>();
  private readonly queryHandlers = new Map<string, any>();
  private readonly metrics: CqrsMetrics = {
    totalCommandsExecuted: 0,
    totalQueriesExecuted: 0,
    totalCommandsFailed: 0,
    totalQueriesFailed: 0,
    commandsByType: {},
    queriesByType: {},
    averageCommandExecutionTime: 0,
    averageQueryExecutionTime: 0,
  };
  private commandExecutionTimes: number[] = [];
  private queryExecutionTimes: number[] = [];

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly eventBus: EventBusService,
  ) {}

  registerCommandHandler<T extends Command>(
    commandType: string,
    handlerClass: new (...args: any[]) => CommandHandler<T>,
  ): void {
    this.commandHandlers.set(commandType, handlerClass);
    this.logger.debug(`Registered command handler for ${commandType}`);
  }

  registerQueryHandler<T extends Query>(
    queryType: string,
    handlerClass: new (...args: any[]) => QueryHandler<T>,
  ): void {
    this.queryHandlers.set(queryType, handlerClass);
    this.logger.debug(`Registered query handler for ${queryType}`);
  }

  async executeCommand<T extends Command, R = any>(command: T): Promise<CommandResult<R>> {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`Executing command: ${command.commandType}`, {
        commandId: command.commandId,
        correlationId: command.metadata.correlationId,
      });

      // Validate command
      command.validate();

      // Get handler
      const handlerClass = this.commandHandlers.get(command.commandType);
      if (!handlerClass) {
        throw new Error(`No handler registered for command: ${command.commandType}`);
      }

      // Create handler instance
      const handler = await this.moduleRef.create(handlerClass);

      // Execute command
      const result = await handler.handle(command);

      // Publish events if any
      if (result.events && result.events.length > 0) {
        await this.eventBus.publishAll(result.events);
      }

      const executionTime = Date.now() - startTime;
      this.updateCommandMetrics(command.commandType, executionTime, true);

      this.logger.debug(`Command executed successfully: ${command.commandType}`, {
        commandId: command.commandId,
        executionTime,
        eventsPublished: result.events?.length || 0,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateCommandMetrics(command.commandType, executionTime, false);

      this.logger.error(`Command execution failed: ${command.commandType}`, {
        commandId: command.commandId,
        error: error.message,
        executionTime,
      });

      return {
        success: false,
        error: error.message,
        metadata: {
          commandId: command.commandId,
          executionTime,
        },
      };
    }
  }

  async executeQuery<T extends Query, R = any>(query: T): Promise<QueryResult<R>> {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`Executing query: ${query.queryType}`, {
        queryId: query.queryId,
        correlationId: query.metadata.correlationId,
      });

      // Validate query
      query.validate();

      // Get handler
      const handlerClass = this.queryHandlers.get(query.queryType);
      if (!handlerClass) {
        throw new Error(`No handler registered for query: ${query.queryType}`);
      }

      // Create handler instance
      const handler = await this.moduleRef.create(handlerClass);

      // Execute query
      const result = await handler.handle(query);

      const executionTime = Date.now() - startTime;
      this.updateQueryMetrics(query.queryType, executionTime, true);

      // Add execution time to result metadata
      if (result.metadata) {
        result.metadata.executionTime = executionTime;
      } else {
        result.metadata = { executionTime };
      }

      this.logger.debug(`Query executed successfully: ${query.queryType}`, {
        queryId: query.queryId,
        executionTime,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateQueryMetrics(query.queryType, executionTime, false);

      this.logger.error(`Query execution failed: ${query.queryType}`, {
        queryId: query.queryId,
        error: error.message,
        executionTime,
      });

      return {
        success: false,
        error: error.message,
        metadata: {
          queryId: query.queryId,
          executionTime,
        },
      };
    }
  }

  getMetrics(): CqrsMetrics {
    return {
      ...this.metrics,
      averageCommandExecutionTime: this.calculateAverageExecutionTime(this.commandExecutionTimes),
      averageQueryExecutionTime: this.calculateAverageExecutionTime(this.queryExecutionTimes),
    };
  }

  clearMetrics(): void {
    this.metrics.totalCommandsExecuted = 0;
    this.metrics.totalQueriesExecuted = 0;
    this.metrics.totalCommandsFailed = 0;
    this.metrics.totalQueriesFailed = 0;
    this.metrics.commandsByType = {};
    this.metrics.queriesByType = {};
    this.commandExecutionTimes = [];
    this.queryExecutionTimes = [];
    this.logger.debug('CQRS metrics cleared');
  }

  private updateCommandMetrics(commandType: string, executionTime: number, success: boolean): void {
    if (success) {
      this.metrics.totalCommandsExecuted++;
    } else {
      this.metrics.totalCommandsFailed++;
    }

    this.metrics.commandsByType[commandType] = (this.metrics.commandsByType[commandType] || 0) + 1;
    this.commandExecutionTimes.push(executionTime);

    // Keep only last 1000 execution times
    if (this.commandExecutionTimes.length > 1000) {
      this.commandExecutionTimes = this.commandExecutionTimes.slice(-1000);
    }
  }

  private updateQueryMetrics(queryType: string, executionTime: number, success: boolean): void {
    if (success) {
      this.metrics.totalQueriesExecuted++;
    } else {
      this.metrics.totalQueriesFailed++;
    }

    this.metrics.queriesByType[queryType] = (this.metrics.queriesByType[queryType] || 0) + 1;
    this.queryExecutionTimes.push(executionTime);

    // Keep only last 1000 execution times
    if (this.queryExecutionTimes.length > 1000) {
      this.queryExecutionTimes = this.queryExecutionTimes.slice(-1000);
    }
  }

  private calculateAverageExecutionTime(executionTimes: number[]): number {
    if (executionTimes.length === 0) {
      return 0;
    }

    const sum = executionTimes.reduce((acc, time) => acc + time, 0);
    return sum / executionTimes.length;
  }
}
