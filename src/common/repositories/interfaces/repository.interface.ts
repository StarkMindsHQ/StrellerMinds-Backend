import { FindManyOptions, FindOneOptions, DeepPartial } from 'typeorm';

export interface IBaseRepository<T> {
  create(entity: DeepPartial<T>): T;
  save(entity: T): Promise<T>;
  saveMany(entities: T[]): Promise<T[]>;
  findOne(options: FindOneOptions<T>): Promise<T | null>;
  findOneById(id: string | number): Promise<T | null>;
  findMany(options?: FindManyOptions<T>): Promise<T[]>;
  findManyByIds(ids: (string | number)[]): Promise<T[]>;
  count(options?: FindManyOptions<T>): Promise<number>;
  exists(options: FindOneOptions<T>): Promise<boolean>;
  update(id: string | number, partialEntity: DeepPartial<T>): Promise<T | null>;
  updateMany(criteria: any, partialEntity: DeepPartial<T>): Promise<any>;
  delete(id: string | number): Promise<void>;
  deleteMany(criteria: any): Promise<any>;
  softDelete(id: string | number): Promise<void>;
  softDeleteMany(criteria: any): Promise<any>;
  restore(id: string | number): Promise<void>;
  restoreMany(criteria: any): Promise<any>;
}

export interface IRepository<T> extends IBaseRepository<T> {
  findWithPagination(
    page: number,
    limit: number,
    options?: FindManyOptions<T>
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  findWithCursor(
    cursor?: string,
    limit?: number,
    options?: FindManyOptions<T>
  ): Promise<{
    data: T[];
    cursor?: string;
    nextCursor?: string | null;
    limit: number;
  }>;

  createQueryBuilder(alias: string);
}

export interface IUnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isTransactionActive(): boolean;
}

export interface IRepositoryFactory {
  getRepository<T>(entity: any): IRepository<T>;
  getCustomRepository<T>(repositoryClass: any): T;
}
