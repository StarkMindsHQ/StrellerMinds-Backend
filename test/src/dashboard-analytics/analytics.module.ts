/**
 * AnalyticsModule provides analytics dashboard, export, and engagement tracking features.
 *
 * @module Analytics
 */
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { AnalyticsController } from "./analytics.controller"
import { AnalyticsService } from "./analytics.service"
import { UserEngagement } from "./entities/user-engagement.entity"
import { CourseCompletion } from "./entities/course-completion.entity"
import { User } from "../users/entities/user.entity"
import { Course } from "../courses/entities/course.entity"

@Module({
  imports: [TypeOrmModule.forFeature([UserEngagement, CourseCompletion, User, Course])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
