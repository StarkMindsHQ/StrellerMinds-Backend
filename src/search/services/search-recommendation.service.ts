import { Injectable, Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { ElasticsearchService } from '@nestjs/elasticsearch';
import type { Course } from '../../courses/entities/course.entity';
import type { User } from '../../users/entities/user.entity';
import type { UserCourseInteraction } from '../../users/entities/user-course-interaction.entity';
import type { SearchAnalytics } from '../entities/search-analytics.entity';
import type { SearchRecommendationDto } from '../dto/search-recommendation.dto';
import type { SearchResult } from '../interfaces/search.interface';
import type { SearchMLService } from './search-ml.service';

interface UserPreferences {
  preferredCategories: string[];
  preferredInstructors: string[];
  preferredLevels: string[];
  preferredDuration: { min: number; max: number };
  preferredPriceRange: { min: number; max: number };
  skillsToLearn: string[];
  completedSkills: string[];
}

@Injectable()
export class SearchRecommendationService {
  private readonly logger = new Logger('SearchRecommendationService');

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly searchMLService: SearchMLService,
    private readonly userRepository: Repository<User>,
    private readonly courseRepository: Repository<Course>,
    private readonly userInteractionRepository: Repository<UserCourseInteraction>,
    private readonly searchAnalyticsRepository: Repository<SearchAnalytics>,
  ) {}

  async getPersonalizedRecommendations(
    recommendationDto: SearchRecommendationDto,
    userId: string,
  ): Promise<SearchResult> {
    try {
      const userPreferences = await this.getUserPreferences(userId);
      const collaborativeRecommendations = await this.getCollaborativeRecommendations(userId);
      const contentBasedRecommendations = await this.getContentBasedRecommendations(
        userId,
        userPreferences,
      );

      // Combine and rank recommendations
      const combinedRecommendations = await this.combineRecommendations(
        collaborativeRecommendations,
        contentBasedRecommendations,
        userPreferences,
        recommendationDto,
      );

      return {
        courses: combinedRecommendations,
        total: combinedRecommendations.length,
        page: recommendationDto.page || 1,
        limit: recommendationDto.limit || 10,
        totalPages: Math.ceil(combinedRecommendations.length / (recommendationDto.limit || 10)),
        aggregations: {},
      };
    } catch (error) {
      this.logger.error('Get personalized recommendations failed', error);
      throw error;
    }
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      // Get user's course interactions
      const interactions = await this.userInteractionRepository.find({
        where: { userId },
        relations: ['course'],
        order: { createdAt: 'DESC' },
        take: 100,
      });

      // Get user's search history
      const searchHistory = await this.searchAnalyticsRepository.find({
        where: { userId },
        order: { searchedAt: 'DESC' },
        take: 50,
      });

      // Analyze preferences from interactions
      const categoryFreq = new Map<string, number>();
      const instructorFreq = new Map<string, number>();
      const levelFreq = new Map<string, number>();
      const skillsFreq = new Map<string, number>();

      let totalDuration = 0;
      let totalPrice = 0;
      let courseCount = 0;

      interactions.forEach((interaction) => {
        if (interaction.course) {
          const course = interaction.course;

          // Count categories
          categoryFreq.set(course.category, (categoryFreq.get(course.category) || 0) + 1);

          // Count instructors
          instructorFreq.set(course.instructor, (instructorFreq.get(course.instructor) || 0) + 1);

          // Count levels
          levelFreq.set(course.level, (levelFreq.get(course.level) || 0) + 1);

          // Count skills
          if (course.skills) {
            course.skills.forEach((skill) => {
              skillsFreq.set(skill, (skillsFreq.get(skill) || 0) + 1);
            });
          }

          totalDuration += course.duration || 0;
          totalPrice += course.price || 0;
          courseCount++;
        }
      });

      const avgDuration = courseCount > 0 ? totalDuration / courseCount : 120;
      const avgPrice = courseCount > 0 ? totalPrice / courseCount : 100;

      return {
        preferredCategories: this.getTopItems(categoryFreq, 5),
        preferredInstructors: this.getTopItems(instructorFreq, 3),
        preferredLevels: this.getTopItems(levelFreq, 3),
        preferredDuration: {
          min: Math.max(0, avgDuration - 60),
          max: avgDuration + 60,
        },
        preferredPriceRange: {
          min: Math.max(0, avgPrice - 50),
          max: avgPrice + 100,
        },
        skillsToLearn: this.getTopItems(skillsFreq, 10),
        completedSkills: interactions
          .filter((i) => i.completed)
          .flatMap((i) => i.course?.skills || []),
      };
    } catch (error) {
      this.logger.error('Get user preferences failed', error);
      return {
        preferredCategories: [],
        preferredInstructors: [],
        preferredLevels: [],
        preferredDuration: { min: 0, max: 300 },
        preferredPriceRange: { min: 0, max: 500 },
        skillsToLearn: [],
        completedSkills: [],
      };
    }
  }

  private async getCollaborativeRecommendations(userId: string): Promise<Course[]> {
    try {
      // Find users with similar course interactions
      const userInteractions = await this.userInteractionRepository.find({
        where: { userId },
        relations: ['course'],
      });

      const userCourseIds = userInteractions.map((i) => i.courseId);

      if (userCourseIds.length === 0) {
        return [];
      }

      // Find similar users who interacted with the same courses
      const similarUsers = await this.userInteractionRepository
        .createQueryBuilder('interaction')
        .select('interaction.userId', 'userId')
        .addSelect('COUNT(*)', 'commonCourses')
        .where('interaction.courseId IN (:...courseIds)', { courseIds: userCourseIds })
        .andWhere('interaction.userId != :userId', { userId })
        .groupBy('interaction.userId')
        .having('COUNT(*) >= :minCommon', {
          minCommon: Math.max(1, Math.floor(userCourseIds.length * 0.2)),
        })
        .orderBy('commonCourses', 'DESC')
        .limit(20)
        .getRawMany();

      if (similarUsers.length === 0) {
        return [];
      }

      const similarUserIds = similarUsers.map((u) => u.userId);

      // Get courses that similar users liked but current user hasn't interacted with
      const recommendations = await this.userInteractionRepository
        .createQueryBuilder('interaction')
        .leftJoinAndSelect('interaction.course', 'course')
        .where('interaction.userId IN (:...similarUserIds)', { similarUserIds })
        .andWhere('interaction.courseId NOT IN (:...userCourseIds)', { userCourseIds })
        .andWhere('interaction.rating >= :minRating', { minRating: 4 })
        .andWhere('course.isActive = :isActive', { isActive: true })
        .groupBy('interaction.courseId, course.id')
        .orderBy('COUNT(*)', 'DESC')
        .limit(20)
        .getMany();

      return recommendations.map((r) => r.course).filter(Boolean);
    } catch (error) {
      this.logger.error('Get collaborative recommendations failed', error);
      return [];
    }
  }

  private async getContentBasedRecommendations(
    userId: string,
    preferences: UserPreferences,
  ): Promise<Course[]> {
    try {
      // Build query based on user preferences
      const searchBody = {
        query: {
          bool: {
            must: [{ term: { isActive: true } }],
            should: [
              // Boost preferred categories
              ...(preferences.preferredCategories.length > 0
                ? [
                    {
                      terms: {
                        category: preferences.preferredCategories,
                        boost: 2.0,
                      },
                    },
                  ]
                : []),

              // Boost preferred instructors
              ...(preferences.preferredInstructors.length > 0
                ? [
                    {
                      terms: {
                        'instructor.keyword': preferences.preferredInstructors,
                        boost: 1.5,
                      },
                    },
                  ]
                : []),

              // Boost skills to learn
              ...(preferences.skillsToLearn.length > 0
                ? [
                    {
                      terms: {
                        skills: preferences.skillsToLearn,
                        boost: 1.8,
                      },
                    },
                  ]
                : []),
            ],
            filter: [
              // Filter by preferred duration range
              {
                range: {
                  duration: {
                    gte: preferences.preferredDuration.min,
                    lte: preferences.preferredDuration.max,
                  },
                },
              },

              // Filter by preferred price range
              {
                range: {
                  price: {
                    gte: preferences.preferredPriceRange.min,
                    lte: preferences.preferredPriceRange.max,
                  },
                },
              },
            ],
            must_not: [
              // Exclude courses with completed skills
              ...(preferences.completedSkills.length > 0
                ? [
                    {
                      terms: { skills: preferences.completedSkills },
                    },
                  ]
                : []),
            ],
          },
        },
        size: 50,
        sort: [
          { _score: { order: 'desc' } },
          { rating: { order: 'desc' } },
          { enrollmentCount: { order: 'desc' } },
        ],
      };

      const response = await this.elasticsearchService.search({
        index: 'courses',
        body: searchBody,
      });

      return response.body.hits.hits.map((hit: any) => ({
        ...hit._source,
        id: hit._id,
        score: hit._score,
      }));
    } catch (error) {
      this.logger.error('Get content-based recommendations failed', error);
      return [];
    }
  }

  private async combineRecommendations(
    collaborative: Course[],
    contentBased: Course[],
    preferences: UserPreferences,
    dto: SearchRecommendationDto,
  ): Promise<Course[]> {
    // Create a map to combine and score recommendations
    const courseScores = new Map<string, { course: Course; score: number }>();

    // Add collaborative filtering results with higher weight
    collaborative.forEach((course, index) => {
      const score = (collaborative.length - index) * 2; // Higher weight for collaborative
      courseScores.set(course.id, { course, score });
    });

    // Add content-based results
    contentBased.forEach((course, index) => {
      const score = (contentBased.length - index) * 1.5;
      const existing = courseScores.get(course.id);

      if (existing) {
        existing.score += score; // Boost if found in both
      } else {
        courseScores.set(course.id, { course, score });
      }
    });

    // Convert to array and sort by combined score
    const sortedRecommendations = Array.from(courseScores.values())
      .sort((a, b) => b.score - a.score)
      .map((item) => item.course);

    // Apply pagination
    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return sortedRecommendations.slice(start, end);
  }

  private getTopItems<T>(frequencyMap: Map<T, number>, limit: number): T[] {
    return Array.from(frequencyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map((entry) => entry[0]);
  }

  async getRecommendationsForCourse(courseId: string, limit = 5): Promise<Course[]> {
    try {
      const course = await this.courseRepository.findOne({ where: { id: courseId } });
      if (!course) {
        return [];
      }

      // Find similar courses based on category, tags, and skills
      const searchBody = {
        query: {
          bool: {
            must: [{ term: { isActive: true } }],
            should: [
              { term: { category: course.category, boost: 2.0 } },
              { terms: { tags: course.tags || [], boost: 1.5 } },
              { terms: { skills: course.skills || [], boost: 1.8 } },
              { term: { level: course.level, boost: 1.2 } },
              { term: { 'instructor.keyword': course.instructor, boost: 1.0 } },
            ],
            must_not: [
              { term: { _id: courseId } }, // Exclude the current course
            ],
          },
        },
        size: limit,
        sort: [{ _score: { order: 'desc' } }, { rating: { order: 'desc' } }],
      };

      const response = await this.elasticsearchService.search({
        index: 'courses',
        body: searchBody,
      });

      return response.body.hits.hits.map((hit: any) => ({
        ...hit._source,
        id: hit._id,
        score: hit._score,
      }));
    } catch (error) {
      this.logger.error('Get course recommendations failed', error);
      return [];
    }
  }

  async getTrendingRecommendations(limit = 10): Promise<Course[]> {
    try {
      // Get trending courses based on recent interactions and searches
      const searchBody = {
        query: {
          bool: {
            must: [
              { term: { isActive: true } },
              {
                range: {
                  createdAt: {
                    gte: 'now-30d', // Courses created in last 30 days
                  },
                },
              },
            ],
          },
        },
        sort: [
          { enrollmentCount: { order: 'desc' } },
          { rating: { order: 'desc' } },
          { createdAt: { order: 'desc' } },
        ],
        size: limit,
      };

      const response = await this.elasticsearchService.search({
        index: 'courses',
        body: searchBody,
      });

      return response.body.hits.hits.map((hit: any) => ({
        ...hit._source,
        id: hit._id,
        score: hit._score,
      }));
    } catch (error) {
      this.logger.error('Get trending recommendations failed', error);
      return [];
    }
  }
}
