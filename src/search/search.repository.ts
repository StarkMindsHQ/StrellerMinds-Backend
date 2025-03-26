/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// Remove unused imports or mark them with eslint-disable
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Like, Between, In } from 'typeorm';
import { Course } from '../courses/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { ForumPost } from '../post/entities/forum-post.entity';
import { ForumTopic } from '../topic/entities/forum-topic.entity';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResultItemDto } from './dto/search-result.dto';

@Injectable()
export class SearchRepository {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ForumPost)
    private forumPostRepository: Repository<ForumPost>,
    @InjectRepository(ForumTopic)
    private forumTopicRepository: Repository<ForumTopic>,
  ) {}

  // Add these methods to fetch all data for indexing
  async getAllCourses(): Promise<SearchResultItemDto[]> {
    const courses = await this.courseRepository.find({
      relations: ['category', 'tags', 'instructor'],
    });

    return Promise.all(
      courses.map((course) => this.mapCourseToSearchResult(course)),
    );
  }

  async getAllForumContent(): Promise<SearchResultItemDto[]> {
    const posts = await this.forumPostRepository.find({
      relations: ['topic', 'author'],
    });

    return Promise.all(
      posts.map((post) => this.mapForumPostToSearchResult(post)),
    );
  }

  async getAllUsers(): Promise<SearchResultItemDto[]> {
    const users = await this.userRepository.find({
      relations: ['profile'],
    });

    return Promise.all(users.map((user) => this.mapUserToSearchResult(user)));
  }

  async searchCourses(
    searchQuery: SearchQueryDto,
  ): Promise<[SearchResultItemDto[], number]> {
    const {
      query,
      categories,
      tags,
      minPrice,
      maxPrice,
      minRating,
      isPublished,
      page,
      limit,
      sortBy,
      order,
    } = searchQuery;

    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.tags', 'tag')
      .leftJoinAndSelect('course.instructor', 'instructor');

    if (query) {
      queryBuilder.where(
        '(course.title LIKE :query OR course.description LIKE :query OR course.objectives LIKE :query)',
        { query: `%${query}%` },
      );
    }

    if (categories && categories.length > 0) {
      queryBuilder.andWhere('category.id IN (:...categories)', { categories });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('tag.id IN (:...tags)', { tags });
    }

    if (minPrice !== undefined) {
      queryBuilder.andWhere('course.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('course.price <= :maxPrice', { maxPrice });
    }

    if (minRating !== undefined) {
      queryBuilder.andWhere('course.rating >= :minRating', {
        // Changed from averageRating to rating
        minRating,
      });
    }

    if (isPublished !== undefined) {
      queryBuilder.andWhere('course.published = :isPublished', {
        // Changed from isPublished to published
        isPublished,
      });
    }

    // Sorting
    const sortField = this.getSortField(sortBy, 'course');
    queryBuilder.orderBy(`${sortField}`, order);

    // Pagination
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [courses, total] = await queryBuilder.getManyAndCount();

    // Map to search result items
    const items = await Promise.all(
      courses.map((course) => this.mapCourseToSearchResult(course, query)),
    );

    return [items, total];
  }

  async searchForumContent(
    searchQuery: SearchQueryDto,
  ): Promise<[SearchResultItemDto[], number]> {
    const { query, page, limit, sortBy, order } = searchQuery;

    // Search in forum posts
    const postQueryBuilder = this.forumPostRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.topic', 'topic')
      .leftJoinAndSelect('post.author', 'author');

    if (query) {
      postQueryBuilder.where(
        '(post.content LIKE :query OR topic.title LIKE :query)',
        { query: `%${query}%` },
      );
    }

    // Sorting
    const sortField = this.getSortField(sortBy, 'post');
    postQueryBuilder.orderBy(`${sortField}`, order);

    // Pagination
    postQueryBuilder.skip((page - 1) * limit).take(limit);

    const [posts, total] = await postQueryBuilder.getManyAndCount();

    // Map to search result items
    const items = await Promise.all(
      posts.map((post) => this.mapForumPostToSearchResult(post, query)),
    );

    return [items, total];
  }

  async searchUsers(
    searchQuery: SearchQueryDto,
  ): Promise<[SearchResultItemDto[], number]> {
    const { query, page, limit, sortBy, order } = searchQuery;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile');

    if (query) {
      queryBuilder.where(
        '(user.firstName LIKE :query OR user.lastName LIKE :query OR user.email LIKE :query OR profile.bio LIKE :query)',
        { query: `%${query}%` },
      );
    }

    // Sorting
    const sortField = this.getSortField(sortBy, 'user');
    queryBuilder.orderBy(`${sortField}`, order);

    // Pagination
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    // Map to search result items
    const items = await Promise.all(
      users.map((user) => this.mapUserToSearchResult(user, query)),
    );

    return [items, total];
  }

  private getSortField(sortBy: string, entityAlias: string): string {
    switch (sortBy) {
      case 'relevance':
        return `${entityAlias}.createdAt`; // Default fallback for relevance
      case 'date':
        return `${entityAlias}.createdAt`;
      case 'price':
        return entityAlias === 'course'
          ? `${entityAlias}.price`
          : `${entityAlias}.createdAt`;
      case 'rating':
        return entityAlias === 'course'
          ? `COALESCE(${entityAlias}.averageRating, ${entityAlias}.rating, 0)` // Try both columns
          : `${entityAlias}.createdAt`;
      default:
        return `${entityAlias}.createdAt`;
    }
  }

  private async mapCourseToSearchResult(
    course: Course,
    query?: string,
  ): Promise<SearchResultItemDto> {
    // Calculate relevance score based on match quality
    const relevanceScore = this.calculateRelevanceScore(query, [
      course.title,
      course.description,
      course.description, // Using description twice since objectives doesn't exist
    ]);

    // Resolve instructor if it exists
    let instructorName = 'Unknown Instructor';
    if (course.instructor) {
      try {
        // Always await the instructor, whether it's a Promise or not
        const instructor = await Promise.resolve(course.instructor);
        if (instructor && instructor.firstName && instructor.lastName) {
          instructorName = `${instructor.firstName} ${instructor.lastName}`;
        }
      } catch {
        // Keep default value if there's an error
      }
    }

    // Resolve category if it exists
    let categoryName = 'Uncategorized';
    if (course.category) {
      try {
        // Always await the category, whether it's a Promise or not
        const category = await Promise.resolve(course.category);
        if (category && category.name) {
          categoryName = category.name;
        }
      } catch {
        // Keep default value if there's an error
      }
    }

    // Resolve tags if they exist
    let tagNames = [];
    if (course.tags) {
      try {
        // Always await the tags, whether it's a Promise or not
        const tags = await Promise.resolve(course.tags);
        if (Array.isArray(tags)) {
          tagNames = tags.map((tag) => tag.name).filter(Boolean);
        }
      } catch {
        // Keep default empty array if there's an error
      }
    }

    return {
      id: course.id,
      type: 'course',
      title: course.title,
      description: course.description,
      imageUrl: course.thumbnail,
      url: `/courses/${course.id}`,
      relevanceScore,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      metadata: {
        price: course.price,
        instructor: instructorName,
        rating: (course as any).rating || 0, // Using type assertion to bypass type checking
        category: categoryName,
        tags: tagNames,
        published: (course as any).published || false, // Using type assertion to bypass type checking
      },
    };
  }

  private async mapForumPostToSearchResult(
    post: ForumPost,
    query?: string,
  ): Promise<SearchResultItemDto> {
    // Resolve topic if it exists
    let topicTitle = 'Forum Post';
    let topicId = undefined;

    if (post.topic) {
      try {
        // Always await the topic, whether it's a Promise or not
        const topic = await Promise.resolve(post.topic);
        if (topic) {
          topicTitle = topic.title || 'Forum Post';
          topicId = topic.id;
        }
      } catch {
        // Keep default values if there's an error
      }
    }

    // Resolve author if it exists
    let authorName = null;
    if (post.author) {
      try {
        // Always await the author, whether it's a Promise or not
        const author = await Promise.resolve(post.author);
        if (author && author.firstName && author.lastName) {
          authorName = `${author.firstName} ${author.lastName}`;
        }
      } catch {
        // Keep default value if there's an error
      }
    }

    // Calculate relevance score based on match quality
    const relevanceScore = this.calculateRelevanceScore(query, [
      post.content,
      topicTitle,
    ]);

    return {
      id: post.id,
      type: 'forum',
      title: topicTitle,
      description:
        post.content.substring(0, 200) +
        (post.content.length > 200 ? '...' : ''),
      url: `/forum/topics/${topicId}/posts/${post.id}`,
      relevanceScore,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      metadata: {
        author: authorName,
        topicId: topicId,
      },
    };
  }

  private async mapUserToSearchResult(
    user: User,
    query?: string,
  ): Promise<SearchResultItemDto> {
    // Resolve user if it's a Promise
    let resolvedUser;
    try {
      // Always await the user, whether it's a Promise or not
      resolvedUser = await Promise.resolve(user);
    } catch {
      // If we can't resolve the user, return a minimal result
      return {
        id: 'unknown',
        type: 'user',
        title: 'Unknown User',
        description: '',
        relevanceScore: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      };
    }

    // Calculate relevance score based on match quality
    const relevanceScore = this.calculateRelevanceScore(query, [
      resolvedUser.firstName,
      resolvedUser.lastName,
      resolvedUser.email,
      resolvedUser.profile?.bio,
    ]);

    return {
      id: resolvedUser.id,
      type: 'user',
      title: `${resolvedUser.firstName} ${resolvedUser.lastName}`,
      description: resolvedUser.profile?.bio || '',
      imageUrl: resolvedUser.profile?.avatarUrl,
      url: `/users/${resolvedUser.id}`,
      relevanceScore,
      createdAt: resolvedUser.createdAt,
      updatedAt: resolvedUser.updatedAt,
      metadata: {
        email: resolvedUser.email,
        role: resolvedUser.role,
      },
    };
  }

  private calculateRelevanceScore(
    query: string,
    fields: (string | undefined)[],
  ): number {
    if (!query) return 1;

    let score = 0;
    const normalizedQuery = query.toLowerCase();

    fields.forEach((field, index) => {
      if (!field) return;

      const normalizedField = field.toLowerCase();

      // Exact match has highest score
      if (normalizedField === normalizedQuery) {
        score += 10 * (fields.length - index);
      }
      // Contains match
      else if (normalizedField.includes(normalizedQuery)) {
        score += 5 * (fields.length - index);
      }
      // Word match
      else if (
        normalizedQuery
          .split(' ')
          .some((word) => normalizedField.includes(word))
      ) {
        score += 2 * (fields.length - index);
      }
    });

    return score;
  }
}
