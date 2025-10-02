import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner, EntityManager } from 'typeorm';
import { TracingService } from './tracing.service';

export interface TracedQueryOptions {
  table?: string;
  operation?: string;
  includeQuery?: boolean;
  includeParams?: boolean;
  includeResult?: boolean;
}

@Injectable()
export class TracedDatabaseService {
  private readonly logger = new Logger(TracedDatabaseService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly tracingService: TracingService,
  ) {}

  /**
   * Execute a traced query
   */
  async query<T = any>(
    sql: string,
    parameters?: any[],
    options: TracedQueryOptions = {},
  ): Promise<T[]> {
    const {
      table,
      operation = 'query',
      includeQuery = false,
      includeParams = false,
      includeResult = false,
    } = options;

    return this.tracingService.withSpan(
      `db.${operation}`,
      async (span) => {
        const startTime = Date.now();

        span.setAttributes({
          'db.system': 'postgresql',
          'db.operation': operation,
          'db.sql.table': table,
          'db.query.timestamp': startTime,
        });

        // Add query information if requested
        if (includeQuery) {
          span.setAttributes({
            'db.statement': sql,
          });
        }

        // Add parameters if requested
        if (includeParams && parameters && parameters.length > 0) {
          span.setAttributes({
            'db.parameters.count': parameters.length,
            'db.parameters': JSON.stringify(parameters.slice(0, 5)), // Limit to first 5 params
          });
        }

        try {
          const result = await this.dataSource.query(sql, parameters);
          const duration = Date.now() - startTime;

          span.setAttributes({
            'db.rows_affected': result.length,
            'db.operation.duration_ms': duration,
            'db.operation.success': true,
          });

          // Add result information if requested and small
          if (includeResult && result && JSON.stringify(result).length < 1000) {
            span.setAttributes({
              'db.result': JSON.stringify(result),
            });
          }

          // Add performance categorization
          if (duration > 1000) {
            span.setAttributes({
              'performance.slow_query': true,
              'performance.duration_category': 'slow',
            });
          } else if (duration > 500) {
            span.setAttributes({
              'performance.duration_category': 'moderate',
            });
          } else {
            span.setAttributes({
              'performance.duration_category': 'fast',
            });
          }

          this.logger.debug(`Database query completed: ${operation}`, {
            duration,
            rowsAffected: result.length,
            table,
            traceId: span.spanContext().traceId,
          });

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;

          span.setAttributes({
            'db.operation.duration_ms': duration,
            'db.operation.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          this.logger.error(`Database query failed: ${operation}`, {
            error: error.message,
            duration,
            table,
            sql: includeQuery ? sql : '[HIDDEN]',
            traceId: span.spanContext().traceId,
          });

          throw error;
        }
      },
      {
        'db.system': 'postgresql',
        'db.operation': operation,
      },
    );
  }

  /**
   * Execute a traced transaction
   */
  async transaction<T>(
    runInTransaction: (manager: EntityManager) => Promise<T>,
    options: TracedQueryOptions = {},
  ): Promise<T> {
    const { operation = 'transaction' } = options;

    return this.tracingService.withSpan(
      `db.${operation}`,
      async (span) => {
        const startTime = Date.now();

        span.setAttributes({
          'db.system': 'postgresql',
          'db.operation': operation,
          'db.transaction.timestamp': startTime,
        });

        const queryRunner = this.dataSource.createQueryRunner();

        try {
          await queryRunner.connect();
          await queryRunner.startTransaction();

          const result = await runInTransaction(queryRunner.manager);

          await queryRunner.commitTransaction();

          const duration = Date.now() - startTime;
          span.setAttributes({
            'db.transaction.duration_ms': duration,
            'db.transaction.success': true,
            'performance.duration_category':
              duration > 1000 ? 'slow' : duration > 500 ? 'moderate' : 'fast',
          });

          this.logger.debug(`Database transaction completed: ${operation}`, {
            duration,
            traceId: span.spanContext().traceId,
          });

          return result;
        } catch (error) {
          await queryRunner.rollbackTransaction();

          const duration = Date.now() - startTime;
          span.setAttributes({
            'db.transaction.duration_ms': duration,
            'db.transaction.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          this.logger.error(`Database transaction failed: ${operation}`, {
            error: error.message,
            duration,
            traceId: span.spanContext().traceId,
          });

          throw error;
        } finally {
          await queryRunner.release();
        }
      },
      {
        'db.system': 'postgresql',
        'db.operation': operation,
      },
    );
  }

  /**
   * Create a traced repository wrapper
   */
  createTracedRepository<T>(entity: any, operation?: string) {
    const repository = this.dataSource.getRepository(entity);

    return {
      find: (options?: any) =>
        this.query(repository.createQueryBuilder().getSql(), [], {
          table: entity.name,
          operation: operation || 'find',
          includeQuery: true,
        }),

      findOne: (options?: any) =>
        this.query(repository.createQueryBuilder().getSql(), [], {
          table: entity.name,
          operation: operation || 'findOne',
          includeQuery: true,
        }),

      save: (entity: T) =>
        this.query(`INSERT INTO ${entity.constructor.name}`, [entity], {
          table: entity.constructor.name,
          operation: 'save',
          includeParams: true,
        }),

      update: (criteria: any, partialEntity: any) =>
        this.query(`UPDATE ${entity.name}`, [criteria, partialEntity], {
          table: entity.name,
          operation: 'update',
          includeParams: true,
        }),

      delete: (criteria: any) =>
        this.query(`DELETE FROM ${entity.name}`, [criteria], {
          table: entity.name,
          operation: 'delete',
          includeParams: true,
        }),
    };
  }
}
