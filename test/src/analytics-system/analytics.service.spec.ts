import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { AnalyticsDataService } from './services/analytics-data.service';
import { RealtimeAnalyticsService } from './services/realtime-analytics.service';
import { PredictiveAnalyticsService } from './services/predictive-analytics.service';
import { ReportingService } from './services/reporting.service';
import { Repository } from 'typeorm';
import { CourseCompletionPrediction } from './entities/course-completion-prediction.entity';

const mockAnalyticsDataService = {};
const mockRealtimeAnalyticsService = {
  getRealtimeDashboardData: jest.fn(),
};
const mockPredictiveAnalyticsService = {
  predictCourseCompletion: jest.fn(),
  getUserCompletionPredictions: jest.fn(),
  getCourseCompletionPredictions: jest.fn(),
};
const mockReportingService = {
  getCoursePerformanceMetrics: jest.fn(),
  getUserEngagementMetrics: jest.fn(),
  getInstructorPerformanceMetrics: jest.fn(),
  getPlatformOverviewMetrics: jest.fn(),
  getPredictiveSummary: jest.fn(),
  generateReport: jest.fn(),
  getReportJobStatus: jest.fn(),
};
const mockPredictionRepo = {
  find: jest.fn(),
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: AnalyticsDataService, useValue: mockAnalyticsDataService },
        {
          provide: RealtimeAnalyticsService,
          useValue: mockRealtimeAnalyticsService,
        },
        {
          provide: PredictiveAnalyticsService,
          useValue: mockPredictiveAnalyticsService,
        },
        { provide: ReportingService, useValue: mockReportingService },
        {
          provide: 'CourseCompletionPredictionRepository',
          useValue: mockPredictionRepo,
        },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  describe('getCoursePerformance', () => {
    it('should throw if no courseId is provided', async () => {
      await expect(service.getCoursePerformance({} as any)).rejects.toThrow(
        'Course ID is required for course performance analytics.',
      );
    });

    it('should return performance metrics', async () => {
      mockReportingService.getCoursePerformanceMetrics.mockResolvedValue(
        'course-metrics',
      );
      const result = await service.getCoursePerformance({ courseId: '123' });
      expect(result).toBe('course-metrics');
    });
  });

  describe('getUserEngagement', () => {
    it('should throw if no userId is provided', async () => {
      await expect(service.getUserEngagement({} as any)).rejects.toThrow(
        'User ID is required for user engagement analytics.',
      );
    });

    it('should return user engagement metrics', async () => {
      mockReportingService.getUserEngagementMetrics.mockResolvedValue(
        'user-metrics',
      );
      const result = await service.getUserEngagement({ userId: '456' });
      expect(result).toBe('user-metrics');
    });
  });

  describe('getInstructorPerformance', () => {
    it('should throw if no instructorId is provided', async () => {
      await expect(service.getInstructorPerformance({} as any)).rejects.toThrow(
        'Instructor ID is required for instructor performance analytics.',
      );
    });

    it('should return instructor performance metrics', async () => {
      mockReportingService.getInstructorPerformanceMetrics.mockResolvedValue(
        'instructor-metrics',
      );
      const result = await service.getInstructorPerformance({
        instructorId: '789',
      });
      expect(result).toBe('instructor-metrics');
    });
  });

  describe('getPlatformOverview', () => {
    it('should return overview metrics', async () => {
      mockReportingService.getPlatformOverviewMetrics.mockResolvedValue(
        'overview',
      );
      const result = await service.getPlatformOverview({});
      expect(result).toBe('overview');
    });
  });

  describe('getRealtimeData', () => {
    it('should return realtime dashboard data', async () => {
      mockRealtimeAnalyticsService.getRealtimeDashboardData.mockResolvedValue(
        'dashboard',
      );
      const result = await service.getRealtimeData();
      expect(result).toBe('dashboard');
    });
  });

  describe('predictCompletion', () => {
    it('should return prediction result', async () => {
      mockPredictiveAnalyticsService.predictCourseCompletion.mockResolvedValue(
        'prediction',
      );
      const result = await service.predictCompletion({} as any);
      expect(result).toBe('prediction');
    });
  });

  describe('getUserPredictions', () => {
    it('should return user predictions', async () => {
      mockPredictiveAnalyticsService.getUserCompletionPredictions.mockResolvedValue(
        ['pred1'],
      );
      const result = await service.getUserPredictions('user123');
      expect(result).toEqual(['pred1']);
    });
  });

  describe('getCoursePredictions', () => {
    it('should return course predictions', async () => {
      mockPredictiveAnalyticsService.getCourseCompletionPredictions.mockResolvedValue(
        ['pred2'],
      );
      const result = await service.getCoursePredictions('course123');
      expect(result).toEqual(['pred2']);
    });
  });

  describe('generateReport', () => {
    it('should return job info', async () => {
      mockReportingService.generateReport.mockResolvedValue({
        jobId: 'job1',
        status: 'pending',
      });
      const result = await service.generateReport({} as any, 'user123');
      expect(result).toEqual({ jobId: 'job1', status: 'pending' });
    });
  });

  describe('getReportStatus', () => {
    it('should return report job status', async () => {
      mockReportingService.getReportJobStatus.mockResolvedValue({
        jobId: 'job1',
      });
      const result = await service.getReportStatus('job1');
      expect(result).toEqual({ jobId: 'job1' });
    });
  });

  describe('getPredictiveSummary', () => {
    it('should return summary', async () => {
      mockReportingService.getPredictiveSummary.mockResolvedValue([
        { summary: 'data' },
      ]);
      const result = await service.getPredictiveSummary({});
      expect(result).toEqual({ summary: 'data' });
    });
  });
});
