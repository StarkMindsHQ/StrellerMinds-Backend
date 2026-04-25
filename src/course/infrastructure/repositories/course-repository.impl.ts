import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ICourseRepository } from '../../domain/repositories/course-repository.interface';
import { Course } from '../../domain/entities/course.entity';
import { CoursePersistenceEntity } from '../persistence/course-persistence.entity';
import { CourseMapper } from '../../application/mappers/course.mapper';

/**
 * Course Repository Implementation
 * Implements the ICourseRepository interface using TypeORM
 * Handles all database operations for Course entities
 */
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
    if (!entity) {
      return null;
    }
    return this.courseMapper.toDomain(entity);
  }

  async findAll(): Promise<Course[]> {
    const entities = await this.typeOrmRepository.find();
    return entities.map((entity) => this.courseMapper.toDomain(entity));
  }

  async findByCategory(category: string): Promise<Course[]> {
    const entities = await this.typeOrmRepository.find({ where: { category } });
    return entities.map((entity) => this.courseMapper.toDomain(entity));
  }

  async findByDifficulty(difficulty: string): Promise<Course[]> {
    const entities = await this.typeOrmRepository.find({ where: { difficulty } });
    return entities.map((entity) => this.courseMapper.toDomain(entity));
  }

  async findByCategoryAndDifficulty(category: string, difficulty: string): Promise<Course[]> {
    const entities = await this.typeOrmRepository.find({
      where: { category, difficulty },
    });
    return entities.map((entity) => this.courseMapper.toDomain(entity));
  }

  async findAllActive(): Promise<Course[]> {
    const entities = await this.typeOrmRepository.find({ where: { isActive: true } });
    return entities.map((entity) => this.courseMapper.toDomain(entity));
  }

  async findByTitle(title: string): Promise<Course[]> {
    const entities = await this.typeOrmRepository
      .createQueryBuilder('course')
      .where('course.title ILIKE :title', { title: `%${title}%` })
      .getMany();
    return entities.map((entity) => this.courseMapper.toDomain(entity));
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
