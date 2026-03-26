/**
 * Base interface for all service layers
 * Provides common patterns for service implementation
 */
export interface IBaseService<T, ID> {
  /**
   * Find an entity by its ID
   */
  findById(id: ID): Promise<T | null>;

  /**
   * Find all entities with optional filtering
   */
  findAll(filters?: any): Promise<T[]>;

  /**
   * Create a new entity
   */
  create(data: any): Promise<T>;

  /**
   * Update an existing entity
   */
  update(id: ID, data: any): Promise<T>;

  /**
   * Delete an entity (soft delete preferred)
   */
  delete(id: ID): Promise<void>;

  /**
   * Validate business rules before operations
   */
  validate(data: any, operation: 'create' | 'update'): Promise<void>;
}

/**
 * Interface for paginated results
 */
export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Interface for service responses with metadata
 */
export interface IServiceResponse<T> {
  data: T;
  message?: string;
  metadata?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

/**
 * Interface for business validation rules
 */
export interface IValidationRule<T> {
  field: keyof T;
  rule: (value: any) => boolean | Promise<boolean>;
  message: string;
}

/**
 * Interface for audit logging
 */
export interface IAuditLog {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  timestamp: Date;
}

/**
 * Interface for transaction management
 */
export interface ITransactionManager {
  executeInTransaction<T>(operation: () => Promise<T>): Promise<T>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
