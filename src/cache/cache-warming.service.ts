import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from '../cache/cache.service';
import { CourseService } from '../../course/course.service';
import { AnalyticsService } from '../../analytics/services/analytics.service';
import { UserService } from '../../user/user.service';

@Injectable()
export class CacheWarmingService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmingService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly courseService: CourseService,
    private readonly analyticsService: AnalyticsService,
    private readonly userService: UserService,
  ) {}

  async onModuleInit() {
    this.logger.log('Cache warming service initialized');
    // Warm cache on startup
    setTimeout(() => this.warmCriticalData(), 5000);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async warmCriticalData() {
    this.logger.log('Starting cache warming...');
    
    try {
      await Promise.allSettled([
        this.warmPopularCourses(),
        this.warmAnalyticsData(),
        this.warmUserProfiles(),
      ]);
      
      this.logger.log('Cache warming completed');
    } catch (error) {
      this.logger.error('Cache warming failed:', error);
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async warmDashboardData() {
    this.logger.debug('Warming dashboard data...');
    
    try {
      // This would typically get active users
      const activeUsers = await this.getActiveUsers();
      
      const warmingPromises = activeUsers.map(userId => 
        this.cacheService.cacheDashboard(userId, () => 
          this.getDashboardData(userId)
        )
      );
      
      await Promise.allSettled(warmingPromises);
    } catch (error) {
      this.logger.error('Dashboard warming failed:', error);
    }
  }

  private async warmPopularCourses() {
    // Get popular courses (example implementation)
    const popularCourses = await this.getPopularCourses();
    
    const coursePromises = popularCourses.map(course => 
      this.cacheService.cacheCourse(course.id, () => 
        this.courseService.getCourseById(course.id)
      )
    );
    
    await Promise.allSettled(coursePromises);
  }

  private async warmAnalyticsData() {
    // Warm analytics for active courses
    const activeCourses = await this.getActiveCourses();
    
    const analyticsPromises = activeCourses.map(courseId => 
      this.cacheService.cacheAnalytics('course', courseId, () => 
        this.analyticsService.getCourseAnalytics(courseId)
      )
    );
    
    await Promise.allSettled(analyticsPromises);
  }

  private async warmUserProfiles() {
    // Warm profiles for recently active users
    const activeUsers = await this.getActiveUsers();
    
    const profilePromises = activeUsers.slice(0, 50).map(userId => 
      this.cacheService.cacheUserProfile(userId, () => 
        this.userService.getProfile(userId)
      )
    );
    
    await Promise.allSettled(profilePromises);
  }

  async warmSpecificData(dataType: string, identifiers: string[]) {
    this.logger.log(`Warming ${dataType} for ${identifiers.length} items`);
    
    const warmers: Record<string, (id: string) => Promise<any>> = {
      course: (id) => this.cacheService.cacheCourse(id, () => 
        this.courseService.getCourseById(id)
      ),
      user: (id) => this.cacheService.cacheUserProfile(id, () => 
        this.userService.getProfile(id)
      ),
      analytics: (id) => this.cacheService.cacheAnalytics('course', id, () => 
        this.analyticsService.getCourseAnalytics(id)
      ),
    };
    
    const warmer = warmers[dataType];
    if (!warmer) {
      this.logger.warn(`No warmer found for data type: ${dataType}`);
      return;
    }
    
    const promises = identifiers.map(id => warmer(id));
    await Promise.allSettled(promises);
  }

  // Helper methods - these would be implemented based on actual service methods
  private async getActiveUsers(): Promise<string[]> {
    // Implementation depends on your user service
    return [];
  }

  private async getPopularCourses() {
    // Implementation depends on your course service
    return [];
  }

  private async getActiveCourses(): Promise<string[]> {
    // Implementation depends on your course service
    return [];
  }

  private async getDashboardData(userId: string) {
    // Implementation depends on your analytics service
    return {};
  }
}
