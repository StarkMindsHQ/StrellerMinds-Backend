import { Injectable } from '@nestjs/common';
import { Repository, FindManyOptions, FindOneOptions, DeepPartial, SelectQueryBuilder } from 'typeorm';
import { IRepository, IUnitOfWork } from '../interfaces/repository.interface';

@Injectable()
export abstract class BaseRepository<T> implements IRepository<T> {
  constructor(protected readonly repository: Repository<T>) {}

  create(entity: DeepPartial<T>): T {
    return this.repository.create(entity);
  }

  async save(entity: T): Promise<T> {
    return this.repository.save(entity);
  }

  async saveMany(entities: T[]): Promise<T[]> {
    return this.repository.save(entities);
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(options);
  }

  async findOneById(id: string | number): Promise<T | null> {
    return this.repository.findOne({ where: { id } } as any);
  }

  async findMany(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  async findManyByIds(ids: (string | number)[]): Promise<T[]> {
    return this.repository.findByIds(ids);
  }

  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count(options);
  }

  async exists(options: FindOneOptions<T>): Promise<boolean> {
    const result = await this.repository.findOne(options);
    return result !== null;
  }

  async update(id: string | number, partialEntity: DeepPartial<T>): Promise<T | null> {
    await this.repository.update(id, partialEntity);
    return this.findOneById(id);
  }

  async updateMany(criteria: any, partialEntity: DeepPartial<T>): Promise<any> {
    return this.repository.update(criteria, partialEntity);
  }

  async delete(id: string | number): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteMany(criteria: any): Promise<any> {
    return this.repository.delete(criteria);
  }

  async softDelete(id: string | number): Promise<void> {
    await this.repository.softDelete(id);
  }

  async softDeleteMany(criteria: any): Promise<any> {
    return this.repository.softDelete(criteria);
  }

  async restore(id: string | number): Promise<void> {
    await this.repository.restore(id);
  }

  async restoreMany(criteria: any): Promise<any> {
    return this.repository.restore(criteria);
  }

  async findWithPagination(
    page: number,
    limit: number,
    options?: FindManyOptions<T>
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await this.repository.findAndCount({
      ...options,
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findWithCursor(
    cursor?: string,
    limit: number = 10,
    options?: FindManyOptions<T>
  ): Promise<{
    data: T[];
    cursor?: string;
    nextCursor?: string | null;
    limit: number;
  }> {
    // Basic cursor implementation - can be extended based on specific needs
    let queryBuilder = this.createQueryBuilder('entity');

    if (cursor) {
      // Parse cursor and apply conditions
      const cursorData = this.parseCursor(cursor);
      if (cursorData) {
        queryBuilder = this.applyCursorConditions(queryBuilder, cursorData);
      }
    }

    queryBuilder.take(limit);

    const data = await queryBuilder.getMany();
    const nextCursor = data.length > 0 ? this.generateCursor(data[data.length - 1]) : null;

    return {
      data,
      cursor,
      nextCursor,
      limit,
    };
  }

  createQueryBuilder(alias: string): SelectQueryBuilder<T> {
    return this.repository.createQueryBuilder(alias);
  }

  protected parseCursor(cursor: string): any {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString());
    } catch {
      return null;
    }
  }

  protected generateCursor(entity: any): string {
    const cursorData = { id: entity.id, createdAt: entity.createdAt };
    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  protected applyCursorConditions(queryBuilder: SelectQueryBuilder<T>, cursorData: any): SelectQueryBuilder<T> {
    // Default implementation - can be overridden in specific repositories
    return queryBuilder.andWhere('entity.createdAt < :createdAt OR (entity.createdAt = :createdAt AND entity.id < :id)', {
      createdAt: cursorData.createdAt,
      id: cursorData.id,
    });
  }
}
