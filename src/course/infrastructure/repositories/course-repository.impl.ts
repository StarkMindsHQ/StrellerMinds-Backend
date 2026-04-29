import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ICourseRepository, PaginatedResult } from '../../domain/repositories/course-repository.interface';
import { Course } from '../../domain/entities/course.entity';
import { CoursePersistenceEntity } from '../persistence/course-persistence.entity';
import { CourseMapper } from '../../application/mappers/course.mapper';

@Injectable()
export class CourseRepositoryImpl implements ICourseRepository {
  constructor(
    @InjectRepository(CoursePersistenceEntity)
    private readonly typeOrmRepository: Repository<CoursePersistenceEntity>,
    private readonly courseMapper: CourseMapper,
  ) {}

  async save(entity: Course): Promise<Course> {
    const persistenceEntity = this.courseMapper.toPersistence(entity);
    const savedEntity = await this.typeOrmRepository.save(persistenceEntity);
    return this.courseMapper.toDomain(savedEntity);
  }

  async findById(id: string): Promise<Course | null> {
    const entity = await this.typeOrmRepository.findOne({ where: { id } });
    return entity ? this.courseMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<Course[]> {
    const entities = await this.typeOrmRepository.find({ take: 1000 });
    return entities.map((e) => this.courseMapper.toDomain(e));
  }

  async findPaginated(limit: number, afterId?: string): Promise<PaginatedResult<Course>> {
    const qb = this.typeOrmRepository
      .createQueryBuilder('course')
      .orderBy('course.id', 'ASC')
      .take(limit + 1);

    if (afterId) {
      qb.where('course.id > :afterId', { afterId });
    }

    const entities = await qb.getMany();
    const hasMore = entities.length > limit;
    const items = entities.slice(0, limit).map((e) => this.courseMapper.toDomain(e));
    return { items, hasMore };
  }

  async findByCategory(category: string, limit: number, afterId?: string): Promise<PaginatedResult<Course>> {
    const qb = this.typeOrmRepository
      .createQueryBuilder('course')
      .where('course.category = :category', { category })
      .orderBy('course.id', 'ASC')
      .take(limit + 1);

    if (afterId) {
      qb.andWhere('course.id > :afterId', { afterId });
    }

    const entities = await qb.getMany();
    const hasMore = entities.length > limit;
    const items = entities.slice(0, limit).map((e) => this.courseMapper.toDomain(e));
    return { items, hasMore };
  }

  async findByDifficulty(difficulty: string, limit: number, afterId?: string): Promise<PaginatedResult<Course>> {
    const qb = this.typeOrmRepository
      .createQueryBuilder('course')
      .where('course.difficulty = :difficulty', { difficulty })
      .orderBy('course.id', 'ASC')
      .take(limit + 1);

    if (afterId) {
      qb.andWhere('course.id > :afterId', { afterId });
    }

    const entities = await qb.getMany();
    const hasMore = entities.length > limit;
    const items = entities.slice(0, limit).map((e) => this.courseMapper.toDomain(e));
    return { items, hasMore };
  }

  async findByCategoryAndDifficulty(category: string, difficulty: string, limit: number, afterId?: string): Promise<PaginatedResult<Course>> {
    const qb = this.typeOrmRepository
      .createQueryBuilder('course')
      .where('course.category = :category AND course.difficulty = :difficulty', { category, difficulty })
      .orderBy('course.id', 'ASC')
      .take(limit + 1);

    if (afterId) {
      qb.andWhere('course.id > :afterId', { afterId });
    }

    const entities = await qb.getMany();
    const hasMore = entities.length > limit;
    const items = entities.slice(0, limit).map((e) => this.courseMapper.toDomain(e));
    return { items, hasMore };
  }

  async findAllActive(): Promise<Course[]> {
    const entities = await this.typeOrmRepository.find({ where: { isActive: true } });
    return entities.map((e) => this.courseMapper.toDomain(e));
  }

  async findByTitle(title: string): Promise<Course[]> {
    const entities = await this.typeOrmRepository
      .createQueryBuilder('course')
      .where('course.title ILIKE :title', { title: `%${title}%` })
      .getMany();
    return entities.map((e) => this.courseMapper.toDomain(e));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.typeOrmRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.typeOrmRepository.count({ where: { id } });
    return count > 0;
  }
}
