import { v4 as uuidv4 } from 'uuid';

export interface QueryMetadata {
  queryId: string;
  correlationId?: string;
  userId?: string;
  timestamp: Date;
  source?: string;
  cacheKey?: string;
  cacheTtl?: number;
  [key: string]: any;
}

export abstract class Query {
  public readonly queryId: string;
  public readonly queryType: string;
  public readonly timestamp: Date;
  public readonly metadata: QueryMetadata;

  constructor(metadata: Partial<QueryMetadata> = {}) {
    this.queryId = uuidv4();
    this.queryType = this.constructor.name;
    this.timestamp = new Date();
    this.metadata = {
      ...metadata,
      queryId: this.queryId,
      timestamp: this.timestamp,
    };
  }

  abstract validate(): void;

  toJSON(): any {
    return {
      queryId: this.queryId,
      queryType: this.queryType,
      timestamp: this.timestamp,
      metadata: this.metadata,
      parameters: this.getParameters(),
    };
  }

  abstract getParameters(): any;
}

export interface QueryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    totalCount?: number;
    pageSize?: number;
    currentPage?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    executionTime?: number;
    cacheHit?: boolean;
    [key: string]: any;
  };
}

export abstract class QueryHandler<TQuery extends Query = Query, TResult = any> {
  abstract handle(query: TQuery): Promise<QueryResult<TResult>>;

  protected createSuccessResult<T>(data: T, metadata?: QueryResult['metadata']): QueryResult<T> {
    return {
      success: true,
      data,
      metadata,
    };
  }

  protected createErrorResult(error: string, metadata?: QueryResult['metadata']): QueryResult {
    return {
      success: false,
      error,
      metadata,
    };
  }

  protected createPaginatedResult<T>(
    data: T[],
    totalCount: number,
    pageSize: number,
    currentPage: number,
    executionTime?: number,
    cacheHit?: boolean,
  ): QueryResult<T[]> {
    const hasNextPage = currentPage * pageSize < totalCount;
    const hasPreviousPage = currentPage > 1;

    return {
      success: true,
      data,
      metadata: {
        totalCount,
        pageSize,
        currentPage,
        hasNextPage,
        hasPreviousPage,
        executionTime,
        cacheHit,
      },
    };
  }
}
