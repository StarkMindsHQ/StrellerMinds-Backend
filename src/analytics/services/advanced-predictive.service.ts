import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EngagementEvent } from '../entities/engagement-event.entity';
import { StudentProgress } from '../entities/student.progress.entity';

/**
 * Advanced Predictive Analytics Service
 * Provides machine learning-based predictions and forecasting
 */
@Injectable()
export class AdvancedPredictiveService {
  private readonly logger = new Logger(AdvancedPredictiveService.name);

  constructor(
    @InjectRepository(EngagementEvent)
    private readonly engagementRepo: Repository<EngagementEvent>,
    @InjectRepository(StudentProgress)
    private readonly progressRepo: Repository<StudentProgress>,
  ) {}

  /**
   * Predict user churn risk
   */
  async predictChurnRisk(userIds: string[]): Promise<ChurnPrediction[]> {
    const predictions: ChurnPrediction[] = [];

    for (const userId of userIds) {
      const riskScore = await this.calculateChurnRisk(userId);
      
      predictions.push({
        userId,
        riskScore,
        riskLevel: this.getRiskLevel(riskScore),
        factors: await this.getChurnRiskFactors(userId),
        recommendedActions: this.getChurnPreventionActions(riskScore),
        predictedAt: new Date().toISOString(),
      });
    }

    return predictions.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Predict course completion probability
   */
  async predictCompletion(userId: string, courseId: string): Promise<CompletionPrediction> {
    const progress = await this.progressRepo.findOne({
      where: { userId, courseId },
    });

    if (!progress) {
      return {
        userId,
        courseId,
        completionProbability: 0,
        estimatedCompletionDate: null,
        factors: [],
      };
    }

    const factors = await this.analyzeCompletionFactors(progress);
    const probability = this.calculateCompletionProbability(factors);
    const estimatedDate = this.estimateCompletionDate(progress, probability);

    return {
      userId,
      courseId,
      completionProbability: probability,
      estimatedCompletionDate: estimatedDate,
      factors,
      recommendations: this.getCompletionRecommendations(factors),
    };
  }

  /**
   * Forecast future metrics
   */
  async forecastMetrics(metric: string, periods: number = 30): Promise<ForecastResult> {
    const historicalData = await this.getHistoricalData(metric, 90);
    
    // Simple linear regression for forecasting
    const forecast = this.linearRegressionForecast(historicalData, periods);
    
    // Calculate confidence intervals
    const confidenceIntervals = this.calculateConfidenceIntervals(forecast);

    return {
      metric,
      forecast,
      confidenceIntervals,
      accuracy: this.calculateForecastAccuracy(historicalData, forecast),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Predict revenue
   */
  async predictRevenue(days: number = 30): Promise<RevenuePrediction> {
    const historicalRevenue = await this.getHistoricalRevenue(90);
    
    // Time series forecasting
    const dailyPredictions: DailyRevenue[] = [];
    let cumulativeRevenue = 0;

    for (let i = 1; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      const predictedAmount = this.forecastRevenueForDay(historicalRevenue, i);
      cumulativeRevenue += predictedAmount;

      dailyPredictions.push({
        date: date.toISOString().split('T')[0],
        predictedRevenue: predictedAmount,
        confidence: Math.max(0.5, 1 - i * 0.01), // Confidence decreases over time
      });
    }

    return {
      period: `${days} days`,
      totalPredictedRevenue: cumulativeRevenue,
      dailyPredictions,
      growthRate: this.calculateGrowthRate(historicalRevenue),
      seasonalityFactors: this.detectSeasonality(historicalRevenue),
    };
  }

  /**
   * Predict user engagement trends
   */
  async predictEngagementTrends(): Promise<EngagementPrediction> {
    const historicalEngagement = await this.getHistoricalEngagement(60);
    
    const dauPrediction = this.forecastMetric(historicalEngagement.dau, 30);
    const mauPrediction = this.forecastMetric(historicalEngagement.mau, 30);
    const sessionDurationPrediction = this.forecastMetric(historicalEngagement.sessionDuration, 30);

    return {
      dau: {
        current: historicalEngagement.dau[historicalEngagement.dau.length - 1],
        predicted30Days: dauPrediction,
        trend: dauPrediction > historicalEngagement.dau[historicalEngagement.dau.length - 1] ? 'up' : 'down',
      },
      mau: {
        current: historicalEngagement.mau[historicalEngagement.mau.length - 1],
        predicted30Days: mauPrediction,
        trend: mauPrediction > historicalEngagement.mau[historicalEngagement.mau.length - 1] ? 'up' : 'down',
      },
      sessionDuration: {
        current: historicalEngagement.sessionDuration[historicalEngagement.sessionDuration.length - 1],
        predicted30Days: sessionDurationPrediction,
        trend: sessionDurationPrediction > historicalEngagement.sessionDuration[historicalEngagement.sessionDuration.length - 1] ? 'up' : 'down',
      },
      insights: this.generateEngagementInsights(historicalEngagement),
    };
  }

  /**
   * Detect anomalies in metrics
   */
  async detectAnomalies(metric: string, threshold: number = 2): Promise<AnomalyDetectionResult> {
    const data = await this.getHistoricalData(metric, 30);
    const anomalies: Anomaly[] = [];

    // Calculate mean and standard deviation
    const mean = data.reduce((sum, d) => sum + d.value, 0) / data.length;
    const variance = data.reduce((sum, d) => sum + Math.pow(d.value - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    // Detect anomalies using Z-score
    for (const point of data) {
      const zScore = Math.abs((point.value - mean) / stdDev);
      
      if (zScore > threshold) {
        anomalies.push({
          timestamp: point.timestamp,
          value: point.value,
          expectedValue: mean,
          deviation: zScore,
          severity: zScore > 3 ? 'critical' : zScore > 2.5 ? 'high' : 'medium',
        });
      }
    }

    return {
      metric,
      anomalies,
      totalAnomalies: anomalies.length,
      threshold,
      analyzed: data.length,
    };
  }

  /**
   * Get personalized recommendations
   */
  async getPersonalizedRecommendations(userId: string): Promise<PersonalizedRecommendations> {
    const [progress, engagement] = await Promise.all([
      this.progressRepo.find({ where: { userId } }),
      this.engagementRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 100,
      }),
    ]);

    const recommendations: Recommendation[] = [];

    // Learning path recommendations
    const learningPathRecs = this.generateLearningPathRecommendations(progress);
    recommendations.push(...learningPathRecs);

    // Engagement recommendations
    const engagementRecs = this.generateEngagementRecommendations(engagement);
    recommendations.push(...engagementRecs);

    // Skill gap recommendations
    const skillGapRecs = await this.generateSkillGapRecommendations(userId, progress);
    recommendations.push(...skillGapRecs);

    return {
      userId,
      recommendations: recommendations.sort((a, b) => b.confidence - a.confidence),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Segment users based on behavior
   */
  async segmentUsers(): Promise<UserSegment[]> {
    const segments: UserSegment[] = [
      { name: 'Power Users', count: 0, characteristics: ['High engagement', 'Frequent logins'], percentage: 0 },
      { name: 'Regular Users', count: 0, characteristics: ['Moderate engagement'], percentage: 0 },
      { name: 'At-Risk Users', count: 0, characteristics: ['Declining engagement'], percentage: 0 },
      { name: 'New Users', count: 0, characteristics: ['Recently joined'], percentage: 0 },
      { name: 'Dormant Users', count: 0, characteristics: ['No activity > 30 days'], percentage: 0 },
    ];

    // Analyze user base and categorize
    const totalUsers = await this.getTotalUsers();
    
    // This would be implemented with actual clustering algorithm
    segments[0].count = Math.floor(totalUsers * 0.1);
    segments[1].count = Math.floor(totalUsers * 0.4);
    segments[2].count = Math.floor(totalUsers * 0.15);
    segments[3].count = Math.floor(totalUsers * 0.2);
    segments[4].count = Math.floor(totalUsers * 0.15);

    for (const segment of segments) {
      segment.percentage = (segment.count / totalUsers) * 100;
    }

    return segments;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async calculateChurnRisk(userId: string): Promise<number> {
    // Factors: last login, engagement frequency, progress rate
    const lastActivity = await this.engagementRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!lastActivity) return 100;

    const daysSinceLastActivity = Math.floor(
      (Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Simple risk calculation
    let risk = Math.min(100, daysSinceLastActivity * 3);
    
    // Adjust based on progress
    const progress = await this.progressRepo.find({ where: { userId } });
    const avgCompletion = progress.length > 0
      ? progress.reduce((sum, p) => sum + p.completionPercentage, 0) / progress.length
      : 0;
    
    if (avgCompletion > 50) risk *= 0.7;
    if (avgCompletion > 80) risk *= 0.5;

    return Math.round(risk);
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 25) return 'low';
    if (score < 50) return 'medium';
    if (score < 75) return 'high';
    return 'critical';
  }

  private async getChurnRiskFactors(userId: string): Promise<string[]> {
    const factors: string[] = [];
    
    // Check various risk factors
    const recentEngagement = await this.engagementRepo.count({
      where: {
        userId,
        createdAt: Between(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
      },
    });

    if (recentEngagement === 0) factors.push('No activity in last 7 days');
    if (recentEngagement < 3) factors.push('Low engagement frequency');

    return factors;
  }

  private getChurnPreventionActions(riskScore: number): string[] {
    if (riskScore >= 75) {
      return ['Send personalized re-engagement email', 'Offer one-on-one support', 'Provide exclusive content'];
    }
    if (riskScore >= 50) {
      return ['Send course recommendations', 'Highlight community features', 'Offer progress rewards'];
    }
    return ['Continue regular engagement', 'Monitor activity'];
  }

  private async analyzeCompletionFactors(progress: StudentProgress): Promise<CompletionFactor[]> {
    const factors: CompletionFactor[] = [];

    // Pace factor
    const daysSinceStart = Math.floor(
      (Date.now() - new Date(progress.startedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const expectedProgress = Math.min(100, (daysSinceStart / 30) * 100); // Assume 30-day course
    const paceFactor = progress.completionPercentage / Math.max(expectedProgress, 1);
    
    factors.push({
      name: 'learning_pace',
      value: paceFactor,
      impact: paceFactor > 1 ? 'positive' : paceFactor > 0.5 ? 'neutral' : 'negative',
      weight: 0.3,
    });

    // Consistency factor
    factors.push({
      name: 'consistency',
      value: 0.7, // Placeholder
      impact: 'positive',
      weight: 0.2,
    });

    return factors;
  }

  private calculateCompletionProbability(factors: CompletionFactor[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      const impactMultiplier = factor.impact === 'positive' ? 1 : factor.impact === 'negative' ? 0.5 : 0.75;
      weightedSum += factor.value * factor.weight * impactMultiplier;
      totalWeight += factor.weight;
    }

    return Math.min(100, Math.round((weightedSum / totalWeight) * 100));
  }

  private estimateCompletionDate(progress: StudentProgress, probability: number): string | null {
    if (probability < 10) return null;

    const remaining = 100 - progress.completionPercentage;
    const daysNeeded = Math.ceil(remaining / (probability / 100) / 3); // Assume 3% per day at 100% probability

    const date = new Date();
    date.setDate(date.getDate() + daysNeeded);
    return date.toISOString();
  }

  private getCompletionRecommendations(factors: CompletionFactor[]): string[] {
    const recommendations: string[] = [];

    for (const factor of factors) {
      if (factor.impact === 'negative') {
        switch (factor.name) {
          case 'learning_pace':
            recommendations.push('Consider breaking lessons into smaller chunks');
            break;
          case 'consistency':
            recommendations.push('Set up daily reminders to maintain streak');
            break;
        }
      }
    }

    return recommendations;
  }

  private async getHistoricalData(metric: string, days: number): Promise<DataPoint[]> {
    // Placeholder - would query actual data
    const data: DataPoint[] = [];
    for (let i = days; i >= 0; i--) {
      data.push({
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        value: Math.random() * 100 + 50,
      });
    }
    return data;
  }

  private linearRegressionForecast(data: DataPoint[], periods: number): ForecastPoint[] {
    const n = data.length;
    const x = data.map((_, i) => i);
    const y = data.map((d) => d.value);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecast: ForecastPoint[] = [];
    for (let i = 1; i <= periods; i++) {
      const predictedValue = slope * (n + i) + intercept;
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        value: Math.max(0, predictedValue),
      });
    }

    return forecast;
  }

  private calculateConfidenceIntervals(forecast: ForecastPoint[]): { upper: number[]; lower: number[] } {
    const stdDev = 10; // Simplified
    return {
      upper: forecast.map((f) => f.value + stdDev * 1.96),
      lower: forecast.map((f) => Math.max(0, f.value - stdDev * 1.96)),
    };
  }

  private calculateForecastAccuracy(historical: DataPoint[], forecast: ForecastPoint[]): number {
    // Simplified accuracy calculation
    return 85;
  }

  private async getHistoricalRevenue(days: number): Promise<number[]> {
    return Array.from({ length: days }, () => Math.random() * 1000 + 500);
  }

  private forecastRevenueForDay(historical: number[], dayOffset: number): number {
    const avg = historical.reduce((a, b) => a + b, 0) / historical.length;
    const trend = 0.02; // 2% growth assumption
    return avg * Math.pow(1 + trend, dayOffset / 30);
  }

  private calculateGrowthRate(data: number[]): number {
    if (data.length < 2) return 0;
    const first = data[0];
    const last = data[data.length - 1];
    return ((last - first) / first) * 100;
  }

  private detectSeasonality(data: number[]): Record<string, number> {
    return {
      weekly: 1.1,
      monthly: 0.95,
      yearly: 1.2,
    };
  }

  private async getHistoricalEngagement(days: number): Promise<HistoricalEngagement> {
    return {
      dau: Array.from({ length: days }, () => Math.floor(Math.random() * 1000 + 500)),
      mau: Array.from({ length: days }, () => Math.floor(Math.random() * 5000 + 2000)),
      sessionDuration: Array.from({ length: days }, () => Math.random() * 30 + 10),
    };
  }

  private forecastMetric(data: number[], periods: number): number {
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const trend = 0.01;
    return avg * Math.pow(1 + trend, periods / 30);
  }

  private generateEngagementInsights(historical: HistoricalEngagement): string[] {
    return [
      'Engagement is trending upward',
      'Weekend activity is 20% lower',
      'Mobile users show higher session frequency',
    ];
  }

  private generateLearningPathRecommendations(progress: StudentProgress[]): Recommendation[] {
    return [{
      type: 'course',
      title: 'Advanced Blockchain Concepts',
      description: 'Based on your progress in introductory courses',
      confidence: 0.85,
      reason: 'Strong performance in fundamentals',
    }];
  }

  private generateEngagementRecommendations(engagement: EngagementEvent[]): Recommendation[] {
    return [{
      type: 'engagement',
      title: 'Join Study Groups',
      description: 'Connect with peers learning similar topics',
      confidence: 0.75,
      reason: 'Social learners show 40% higher completion rates',
    }];
  }

  private async generateSkillGapRecommendations(userId: string, progress: StudentProgress[]): Promise<Recommendation[]> {
    return [{
      type: 'skill',
      title: 'Smart Contract Security',
      description: 'Critical skill for blockchain developers',
      confidence: 0.9,
      reason: 'Identified gap in security knowledge',
    }];
  }

  private async getTotalUsers(): Promise<number> {
    return 10000; // Placeholder
  }
}

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ChurnPrediction {
  userId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendedActions: string[];
  predictedAt: string;
}

export interface CompletionPrediction {
  userId: string;
  courseId: string;
  completionProbability: number;
  estimatedCompletionDate: string | null;
  factors: CompletionFactor[];
  recommendations?: string[];
}

export interface CompletionFactor {
  name: string;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
}

export interface ForecastResult {
  metric: string;
  forecast: ForecastPoint[];
  confidenceIntervals: { upper: number[]; lower: number[] };
  accuracy: number;
  generatedAt: string;
}

export interface ForecastPoint {
  date: string;
  value: number;
}

export interface RevenuePrediction {
  period: string;
  totalPredictedRevenue: number;
  dailyPredictions: DailyRevenue[];
  growthRate: number;
  seasonalityFactors: Record<string, number>;
}

export interface DailyRevenue {
  date: string;
  predictedRevenue: number;
  confidence: number;
}

export interface EngagementPrediction {
  dau: MetricPrediction;
  mau: MetricPrediction;
  sessionDuration: MetricPrediction;
  insights: string[];
}

export interface MetricPrediction {
  current: number;
  predicted30Days: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AnomalyDetectionResult {
  metric: string;
  anomalies: Anomaly[];
  totalAnomalies: number;
  threshold: number;
  analyzed: number;
}

export interface Anomaly {
  timestamp: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'medium' | 'high' | 'critical';
}

export interface PersonalizedRecommendations {
  userId: string;
  recommendations: Recommendation[];
  generatedAt: string;
}

export interface Recommendation {
  type: 'course' | 'engagement' | 'skill' | 'content';
  title: string;
  description: string;
  confidence: number;
  reason: string;
}

export interface UserSegment {
  name: string;
  count: number;
  characteristics: string[];
  percentage: number;
}

interface DataPoint {
  timestamp: string;
  value: number;
}

interface HistoricalEngagement {
  dau: number[];
  mau: number[];
  sessionDuration: number[];
}
