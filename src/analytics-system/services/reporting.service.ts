import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import * as PDFDocument from 'pdfkit';
import { createWriteStream, promises as fs } from 'fs';
import { join } from 'path';
import { ReportGenerationJob, ReportJobStatus } from '../entities/report-generation-job.entity';
import type { GenerateReportDto, ReportExportDto } from '../dto/generate-report.dto';
import {
  ReportFormat,
  ReportType,
  type CoursePerformanceMetrics,
  type UserEngagementMetrics,
  type InstructorPerformanceMetrics,
  type Course,
} from '../interfaces/analytics.interface';
import type { AnalyticsDataService } from './analytics-data.service';
import type { PredictiveAnalyticsService } from './predictive-analytics.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Between } from 'typeorm';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);
  private readonly reportDir: string = './reports'; // Configurable directory

  constructor(
    @InjectRepository(ReportGenerationJob)
    private readonly reportJobRepository: Repository<ReportGenerationJob>,
    private readonly analyticsDataService: AnalyticsDataService,
    private readonly predictiveAnalyticsService: PredictiveAnalyticsService,
  ) {
    // Ensure report directory exists on service initialization
    fs.mkdir(this.reportDir, { recursive: true }).catch((err) =>
      this.logger.error(`Failed to create report directory: ${err.message}`),
    );
  }

  async generateReport(
    dto: GenerateReportDto,
    userId: string,
  ): Promise<{ jobId: string; status: ReportJobStatus }> {
    const job = this.reportJobRepository.create({
      userId,
      reportType: dto.reportType,
      parameters: dto,
      status: ReportJobStatus.PENDING,
    });
    await this.reportJobRepository.save(job);

    // Asynchronously process the report
    this.processReportJob(job.id)
      .then(() => this.logger.log(`Report job ${job.id} completed.`))
      .catch((error) => this.logger.error(`Report job ${job.id} failed: ${error.message}`));

    return { jobId: job.id, status: job.status };
  }

  async getReportJobStatus(jobId: string): Promise<ReportGenerationJob | null> {
    return this.reportJobRepository.findOne({ where: { id: jobId } });
  }

  private async processReportJob(jobId: string): Promise<void> {
    const job = await this.reportJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      this.logger.error(`Report job ${jobId} not found.`);
      return;
    }

    job.status = ReportJobStatus.IN_PROGRESS;
    await this.reportJobRepository.save(job);

    try {
      const reportData = await this.fetchReportData(job.reportType, job.parameters);
      const filename = `${job.reportType.toLowerCase()}_${job.userId}_${Date.now()}`;
      const filePath = await this.exportReport({
        data: reportData,
        format: job.parameters.format,
        reportName: filename,
        reportTitle: job.parameters.title || `${job.reportType} Report`,
        metadata: job.parameters,
      });

      job.filePath = `/api/analytics/reports/download/${filename}.${job.parameters.format}`; // Placeholder URL
      job.status = ReportJobStatus.COMPLETED;
      job.completedAt = new Date();
      await this.reportJobRepository.save(job);
    } catch (error) {
      this.logger.error(`Error processing report job ${jobId}: ${error.message}`, error.stack);
      job.status = ReportJobStatus.FAILED;
      job.errorMessage = error.message;
      await this.reportJobRepository.save(job);
    }
  }

  private async fetchReportData(reportType: ReportType, params: any): Promise<any[]> {
    const startDate = params.startDate ? new Date(params.startDate) : undefined;
    const endDate = params.endDate ? new Date(params.endDate) : undefined;

    switch (reportType) {
      case ReportType.COURSE_PERFORMANCE:
        return [await this.getCoursePerformanceMetrics(params.courseId, startDate, endDate)];
      case ReportType.USER_ENGAGEMENT:
        return [await this.getUserEngagementMetrics(params.userId, startDate, endDate)];
      case ReportType.INSTRUCTOR_PERFORMANCE:
        return [
          await this.getInstructorPerformanceMetrics(params.instructorId, startDate, endDate),
        ];
      case ReportType.PREDICTIVE_SUMMARY:
        return await this.getPredictiveSummary(startDate, endDate);
      case ReportType.PLATFORM_OVERVIEW:
        return [await this.getPlatformOverviewMetrics(startDate, endDate)];
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  private async getCoursePerformanceMetrics(
    courseId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CoursePerformanceMetrics> {
    const course = await this.analyticsDataService.getCourses(courseId);
    if (!course || course.length === 0) {
      throw new Error('Course not found');
    }
    const interactions = await this.analyticsDataService.getCourseInteractions(
      courseId,
      undefined,
      startDate,
      endDate,
    );
    const aggregatedMetrics = await this.analyticsDataService.getAggregatedCourseMetrics(
      courseId,
      startDate,
      endDate,
    );

    const totalEnrollments = interactions.filter((i) => i.progress === 0).length;
    const totalCompletions = interactions.filter((i) => i.completed).length;
    const completionRate = totalEnrollments > 0 ? (totalCompletions / totalEnrollments) * 100 : 0;

    let totalProgress = 0;
    let totalTimeSpent = 0;
    let dropOffCount = 0;
    const activeUsersSet = new Set<string>();

    interactions.forEach((i) => {
      totalProgress += i.progress || 0;
      totalTimeSpent += i.timeSpent || 0;
      activeUsersSet.add(i.userId);
      if (i.progress > 0 && !i.completed && i.timeSpent < course[0].duration * 0.2) {
        dropOffCount++;
      }
    });

    const averageProgress = activeUsersSet.size > 0 ? totalProgress / activeUsersSet.size : 0;
    const averageTimeSpent = activeUsersSet.size > 0 ? totalTimeSpent / activeUsersSet.size : 0;
    const dropOffRate = totalEnrollments > 0 ? (dropOffCount / totalEnrollments) * 100 : 0;

    // Trends from aggregated metrics
    const enrollmentTrend = aggregatedMetrics.map((m) => ({
      date: m.date.toISOString().split('T')[0],
      count: m.totalEnrollments,
    }));
    const completionTrend = aggregatedMetrics.map((m) => ({
      date: m.date.toISOString().split('T')[0],
      count: m.totalCompletions,
    }));

    return {
      totalEnrollments,
      totalCompletions,
      completionRate,
      averageProgress,
      averageTimeSpent,
      dropOffRate,
      activeUsers: activeUsersSet.size,
      topLessons: [], // Requires lesson-level tracking
      enrollmentTrend,
      completionTrend,
    };
  }

  private async getUserEngagementMetrics(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserEngagementMetrics> {
    const user = await this.analyticsDataService.getUsers(userId);
    if (!user || user.length === 0) {
      throw new Error('User not found');
    }
    const interactions = await this.analyticsDataService.getCourseInteractions(
      undefined,
      userId,
      startDate,
      endDate,
    );

    const totalCoursesEnrolled = new Set(interactions.map((i) => i.courseId)).size;
    const totalCoursesCompleted = new Set(
      interactions.filter((i) => i.completed).map((i) => i.courseId),
    ).size;
    const averageCompletionRate =
      totalCoursesEnrolled > 0 ? (totalCoursesCompleted / totalCoursesEnrolled) * 100 : 0;

    let totalTimeSpent = 0;
    interactions.forEach((i) => (totalTimeSpent += i.timeSpent || 0));
    const averageTimeSpentPerCourse =
      totalCoursesEnrolled > 0 ? totalTimeSpent / totalCoursesEnrolled : 0;

    const activeDays = new Set(interactions.map((i) => i.createdAt.toISOString().split('T')[0]))
      .size;

    const mostActiveCourses = interactions
      .filter((i) => i.course)
      .reduce((acc, i) => {
        acc[i.courseId] = (acc[i.courseId] || 0) + (i.timeSpent || 0);
        return acc;
      }, {});
    const sortedActiveCourses = Object.entries(mostActiveCourses)
      .sort(([, timeA], [, timeB]) => (timeB as number) - (timeA as number))
      .slice(0, 5)
      .map(([courseId]) => interactions.find((i) => i.courseId === courseId)?.course)
      .filter(Boolean) as Course[];

    const recentActivities = interactions
      .slice(0, 10)
      .map((i) => ({
        type: i.completed ? 'Course Completed' : 'Course Progressed',
        courseTitle: i.course?.title || 'N/A',
        timestamp: i.updatedAt,
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      totalCoursesEnrolled,
      totalCoursesCompleted,
      averageCompletionRate,
      averageTimeSpentPerCourse,
      activeDays,
      mostActiveCourses: sortedActiveCourses,
      recentActivities,
    };
  }

  private async getInstructorPerformanceMetrics(
    instructorId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<InstructorPerformanceMetrics> {
    const courses = await this.analyticsDataService.getCourses(undefined, instructorId);
    if (!courses || courses.length === 0) {
      throw new Error('Instructor not found or has no courses');
    }

    let totalEnrollmentsAcrossCourses = 0;
    let totalCompletionsAcrossCourses = 0;
    let totalCourseRatings = 0;
    let ratedCourseCount = 0;
    const topPerformingCourses: Course[] = [];

    for (const course of courses) {
      const interactions = await this.analyticsDataService.getCourseInteractions(
        course.id,
        undefined,
        startDate,
        endDate,
      );
      totalEnrollmentsAcrossCourses += interactions.filter((i) => i.progress === 0).length;
      totalCompletionsAcrossCourses += interactions.filter((i) => i.completed).length;

      if (course.rating && course.rating > 0) {
        totalCourseRatings += course.rating;
        ratedCourseCount++;
      }
      topPerformingCourses.push(course); // Placeholder, would sort by rating/enrollment
    }

    const averageCourseRating = ratedCourseCount > 0 ? totalCourseRatings / ratedCourseCount : 0;
    const averageCompletionRate =
      totalEnrollmentsAcrossCourses > 0
        ? (totalCompletionsAcrossCourses / totalEnrollmentsAcrossCourses) * 100
        : 0;

    return {
      totalCourses: courses.length,
      averageCourseRating,
      totalEnrollmentsAcrossCourses,
      totalCompletionsAcrossCourses,
      averageCompletionRate,
      topPerformingCourses: topPerformingCourses
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 5),
      studentFeedbackSummary: { positive: 0, negative: 0, neutral: 0 }, // Requires feedback system
    };
  }

  private async getPredictiveSummary(startDate?: Date, endDate?: Date): Promise<any[]> {
    const predictions = await this.predictiveAnalyticsService.getPredictions({
      startDate,
      endDate,
    });

    const summary = {
      totalPredictions: predictions.length,
      highLikelihood: predictions.filter((p) => p.completionLikelihood >= 0.7).length,
      mediumLikelihood: predictions.filter(
        (p) => p.completionLikelihood >= 0.4 && p.completionLikelihood < 0.7,
      ).length,
      lowLikelihood: predictions.filter((p) => p.completionLikelihood < 0.4).length,
      averageLikelihood:
        predictions.length > 0
          ? predictions.reduce((sum, p) => sum + p.completionLikelihood, 0) / predictions.length
          : 0,
      topPredictedCompletions: predictions
        .filter((p) => p.completionLikelihood >= 0.7)
        .slice(0, 10)
        .map((p) => ({
          user: p.user?.username,
          course: p.course?.title,
          likelihood: p.completionLikelihood,
          predictedDate: p.predictedCompletionDate,
        })),
    };
    return [summary];
  }

  private async getPlatformOverviewMetrics(startDate?: Date, endDate?: Date): Promise<any> {
    const totalUsers = await this.analyticsDataService.getUsers().then((users) => users.length);
    const totalCourses = await this.analyticsDataService
      .getCourses()
      .then((courses) => courses.length);
    const totalInteractions = await this.analyticsDataService
      .getCourseInteractions(undefined, undefined, startDate, endDate)
      .then((interactions) => interactions.length);

    const totalEnrollments = await this.analyticsDataService
      .getEnrollments(startDate, endDate)
      .then((enrollments) => enrollments.length);
    const totalCompletions = await this.analyticsDataService
      .getCompletions(startDate, endDate)
      .then((completions) => completions.length);

    return {
      totalUsers,
      totalCourses,
      totalInteractions,
      totalEnrollments,
      totalCompletions,
      overallCompletionRate: totalEnrollments > 0 ? (totalCompletions / totalEnrollments) * 100 : 0,
      // Add more platform-wide metrics as needed
    };
  }

  private async exportReport(exportDto: ReportExportDto): Promise<string> {
    const { data, format, reportName, reportTitle, metadata } = exportDto;
    const filePath = join(this.reportDir, `${reportName}.${format}`);

    switch (format) {
      case ReportFormat.EXCEL:
        return this.exportToExcel(data, filePath, reportTitle, metadata);
      case ReportFormat.CSV:
        return this.exportToCSV(data, filePath, reportTitle, metadata);
      case ReportFormat.PDF:
        return this.exportToPDF(data, filePath, reportTitle, metadata);
      case ReportFormat.JSON:
        return this.exportToJSON(data, filePath, reportTitle, metadata);
      default:
        throw new Error('Unsupported report format');
    }
  }

  private async exportToExcel(
    data: any[],
    filePath: string,
    title: string,
    metadata: any,
  ): Promise<string> {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Data');

    const metadataSheet = XLSX.utils.json_to_sheet([
      { Property: 'Report Title', Value: title },
      { Property: 'Generated At', Value: new Date().toISOString() },
      { Property: 'Total Records', Value: data.length },
      ...Object.entries(metadata || {}).map(([key, value]) => ({
        Property: key,
        Value: JSON.stringify(value),
      })),
    ]);
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

    XLSX.writeFile(workbook, filePath);
    return filePath;
  }

  private async exportToCSV(
    data: any[],
    filePath: string,
    title: string,
    metadata: any,
  ): Promise<string> {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    let header = `Report Title: "${title}"\nGenerated At: "${new Date().toISOString()}"\nTotal Records: ${data.length}\n`;
    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        header += `${key}: "${JSON.stringify(value)}"\n`;
      }
    }
    await fs.writeFile(filePath, header + '\n' + csv, 'utf8');
    return filePath;
  }

  private async exportToPDF(
    data: any[],
    filePath: string,
    title: string,
    metadata: any,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const stream = createWriteStream(filePath);

      doc.pipe(stream);

      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown();

      doc.fontSize(10).text(`Generated At: ${new Date().toLocaleString()}`);
      doc.text(`Total Records: ${data.length}`);
      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          doc.text(`${key}: ${JSON.stringify(value)}`);
        });
      }
      doc.moveDown();

      data.forEach((row, index) => {
        if (index > 0) doc.moveDown();
        doc.fontSize(12).text(`Record ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          doc.text(`  ${key}: ${JSON.stringify(value)}`);
        });
      });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  private async exportToJSON(
    data: any[],
    filePath: string,
    title: string,
    metadata: any,
  ): Promise<string> {
    const exportData = {
      metadata: {
        reportTitle: title,
        generatedAt: new Date().toISOString(),
        totalRecords: data.length,
        ...metadata,
      },
      data,
    };
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
    return filePath;
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanupOldReports() {
    try {
      const files = await fs.readdir(this.reportDir);
      const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago

      for (const file of files) {
        const filePath = join(this.reportDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          this.logger.log(`Deleted old report file: ${file}`);
        }
      }

      // Also clean up old job records
      await this.reportJobRepository.delete({
        completedAt: Between(new Date(0), new Date(cutoffTime)),
        status: ReportJobStatus.COMPLETED,
      });
      this.logger.log('Cleaned up old report job records.');
    } catch (error) {
      this.logger.error('Cleanup old reports failed', error);
    }
  }
}
