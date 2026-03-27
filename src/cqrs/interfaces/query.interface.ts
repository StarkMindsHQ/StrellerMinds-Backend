export interface IQuery<T = any> {
  readonly params: T;
  readonly timestamp: Date;
  readonly id: string;
}

export interface IQueryHandler<TQuery extends IQuery, TResult = any> {
  handle(query: TQuery): Promise<TResult>;
}

export interface IQueryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  total?: number;
  page?: number;
  limit?: number;
}
