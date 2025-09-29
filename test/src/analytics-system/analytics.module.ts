import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ScheduleModule } from "@nestjs/schedule"
import { CacheModule } from "@nestjs/cache-manager"
import { HttpModule } from "@nestjs/axios"
import { AnalyticsService } from "./analytics.service"
import { AnalyticsController } from "./analytics.controller"
import { AnalyticsDataService } from "./services/analytics-data.service"
import { RealtimeAnalyticsService } from "./services/realtime-analytics.service"
import { PredictiveAnalyticsService } from "./services/predictive-analytics.service"
import { ReportingService } from "./services/reporting.service"
import { UserCourseInteraction } from "../users/entities/user-course-interaction.entity"
import { Course } from "../courses/entities/course.entity"
import { User } from "../users/entities/user.entity"
import { CourseCompletionPrediction } from "./entities/course-completion-prediction.entity"
import { CourseEngagementMetric } from "./entities/course-engagement-metric.entity"
import { ReportGenerationJob } from "./entities/report-generation-job.entity"

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserCourseInteraction,
      Course,
      User,
      CourseCompletionPrediction,
      CourseEngagementMetric,
      ReportGenerationJob,
    ]),
    ScheduleModule.forRoot(), // For cron jobs
    CacheModule.register({
      ttl: 60, // seconds, default TTL for cache entries
      max: 100, // maximum number of items in cache
    }),
    HttpModule, // For potential external ML APIs in PredictiveAnalyticsService
  ],
  providers: [
    AnalyticsService,
    AnalyticsDataService,
    RealtimeAnalyticsService,
    PredictiveAnalyticsService,
    ReportingService,
  ],
  controllers: [AnalyticsController],
  exports: [AnalyticsService], // Export if other modules need to use AnalyticsService
})
export class AnalyticsModule {}
