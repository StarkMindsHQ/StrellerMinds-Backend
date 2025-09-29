import { Module } from '@nestjs/common';
import { CoursesAdvancesController } from './controllers/courses-advances.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseAnalyticsController } from './controllers/course-analytics.controller';
import { CourseVersionsController } from './controllers/course-versions.controller';
import { CourseAnalytics } from './entities/course-analytics.entity';
import { CoursePerformance } from './entities/course-performance.entity';
import { CourseVersion } from './entities/course-version.entity';
import { CoursesAdvance } from './entities/courses-advance.entity';
import { CourseAnalyticsService } from './services/course-analytics.service';
import { CourseVersionsService } from './services/course-versions.service';
import { CoursesAdvancesService } from './services/courses-advances.service';
import { InstructorToolsService } from './services/instructor-tools.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CoursesAdvance,
      CourseVersion,
      CourseAnalytics,
      CoursePerformance,
    ]),
  ],
  controllers: [
    CoursesAdvancesController,
    CourseAnalyticsController,
    CourseVersionsController,
  ],
  providers: [
    CoursesAdvancesService,
    CourseAnalyticsService,
    CourseVersionsService,
    InstructorToolsService,
  ],
  exports: [
    CoursesAdvancesService,
    CourseAnalyticsService,
    CourseVersionsService,
    InstructorToolsService,
  ],
})
export class CoursesAdvancesModule {}
