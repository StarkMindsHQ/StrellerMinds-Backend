import { Injectable } from '@nestjs/common';
import { CreateCourseDto, CourseQueryDto, CreateCourseDtoV2, CourseQueryDtoV2 } from '../dto';

@Injectable()
export class CoursesService {
  async findAllV1(query: CourseQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    return {
      courses: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  async findAllV2(query: CourseQueryDtoV2) {
    const {
      page = 1,
      limit = 10,
      search,
      tags,
      difficulty,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
    } = query;

    const skip = (page - 1) * limit;

    return {
      courses: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
      filters: {
        appliedTags: tags,
        difficulty,
        priceRange: { min: minPrice, max: maxPrice },
      },
      sorting: {
        field: sortBy,
        order: sortOrder,
      },
    };
  }

  async findOneV1(id: string) {
    return {
      id,
      title: 'Sample Course',
      description: 'Course description',
      price: 100,
      tags: ['blockchain', 'stellar'],
    };
  }

  async findOneV2(id: string) {
    return {
      id,
      title: 'Sample Course',
      description: 'Course description',
      price: 100,
      tags: ['blockchain', 'stellar'],
      difficulty: 'beginner',
      estimatedHours: 10,
      thumbnailUrl: 'https://example.com/thumb.jpg',
      requiresStellarWallet: true,
      prerequisites: [],
      instructor: {
        id: 'instructor-1',
        name: 'John Doe',
        rating: 4.8,
      },
      modules: [],
      ratings: {
        average: 4.5,
        count: 150,
      },
      enrollmentCount: 1200,
    };
  }

  async createV1(createCourseDto: CreateCourseDto) {
    return {
      id: 'new-course-id',
      ...createCourseDto,
      createdAt: new Date(),
    };
  }

  async createV2(createCourseDto: CreateCourseDtoV2) {
    return {
      id: 'new-course-id',
      ...createCourseDto,
      createdAt: new Date(),
      status: 'draft',
      slug: this.generateSlug(createCourseDto.title),
    };
  }

  private generateSlug(title: string): string {
    return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
}
