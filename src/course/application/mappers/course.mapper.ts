import { Injectable } from '@nestjs/common';
import { Mapper } from '../../../shared/application/mappers/mapper.base';
import { Course } from '../../domain/entities/course.entity';
import { CoursePersistenceEntity } from '../../infrastructure/persistence/course-persistence.entity';

/**
 * Course Response DTO
 */
export class CourseResponseDTO {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly category: string | undefined,
    public readonly difficulty: string | undefined,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

/**
 * Course Mapper
 * Handles conversion between domain entity, persistence entity, and DTO
 */
@Injectable()
export class CourseMapper extends Mapper<Course, CourseResponseDTO> {
  toPersistence(entity: Course): Partial<CoursePersistenceEntity> {
    const primitives = entity.toPrimitives();
    return {
      id: primitives.id,
      title: primitives.title,
      description: primitives.description,
      category: primitives.category,
      difficulty: primitives.difficulty,
      isActive: primitives.isActive,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }

  toDomain(raw: CoursePersistenceEntity): Course {
    return Course.create({
      id: raw.id,
      title: raw.title,
      description: raw.description,
      category: raw.category,
      difficulty: raw.difficulty,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  toDTO(entity: Course): CourseResponseDTO {
    const primitives = entity.toPrimitives();
    return new CourseResponseDTO(
      primitives.id,
      primitives.title,
      primitives.description,
      primitives.category,
      primitives.difficulty,
      primitives.isActive,
      primitives.createdAt,
      primitives.updatedAt,
    );
  }
}
