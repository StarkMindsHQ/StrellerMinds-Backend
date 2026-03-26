import { Injectable, Logger } from '@nestjs/common';
import {
  IBaseService,
  IPaginatedResult,
  IServiceResponse,
  IValidationRule,
  IAuditLog,
} from '../interfaces/service.interface';

/**
 * Abstract base service implementing common patterns
 */
@Injectable()
export abstract class BaseService<T, ID> implements IBaseService<T, ID> {
  protected readonly logger = new Logger(this.constructor.name);

  /**
   * Abstract method to be implemented by concrete services
   */
  abstract findById(id: ID): Promise<T | null>;
  abstract findAll(filters?: any): Promise<T[]>;
  abstract create(data: any): Promise<T>;
  abstract update(id: ID, data: any): Promise<T>;
  abstract delete(id: ID): Promise<void>;

  /**
   * Default validation implementation
   */
  async validate(data: any, operation: 'create' | 'update'): Promise<void> {
    const rules = this.getValidationRules(operation);

    for (const rule of rules) {
      const isValid = await rule.rule(data[rule.field]);
      if (!isValid) {
        throw new Error(`Validation failed for ${String(rule.field)}: ${rule.message}`);
      }
    }
  }

  /**
   * Override this method in concrete services to define validation rules
   */
  protected getValidationRules(operation: 'create' | 'update'): IValidationRule<T>[] {
    return [];
  }

  /**
   * Create a standardized service response
   */
  protected createServiceResponse<U>(data: U, message?: string): IServiceResponse<U> {
    return {
      data,
      message,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
      },
    };
  }

  /**
   * Create paginated result
   */
  protected createPaginatedResult<U>(
    data: U[],
    total: number,
    page: number,
    limit: number,
  ): IPaginatedResult<U> {
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Generate a unique request ID for tracking
   */
  private generateRequestId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Log audit information
   */
  protected async logAudit(auditLog: IAuditLog): Promise<void> {
    this.logger.log(`Audit: ${auditLog.action} on ${auditLog.resource}`, {
      userId: auditLog.userId,
      resourceId: auditLog.resourceId,
      timestamp: auditLog.timestamp,
    });
  }
}
