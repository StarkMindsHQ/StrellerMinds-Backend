import { Injectable } from '@nestjs/common';
import { MetricsService } from '../metrics.service';

@Injectable()
export class BusinessMetricsService {
  constructor(private readonly metricsService: MetricsService) {}

  // ===== User Metrics =====
  trackUserRegistration(source: string, method: string) {
    this.metricsService.trackUserRegistration(source, method);
  }

  trackUserLogin(method: string) {
    this.metricsService.trackUserLogin(method);
  }

  setActiveUsers(count: number) {
    this.metricsService.setActiveUsers(count);
  }

  // ===== Course Metrics =====
  trackCourseEnrollment(courseId: string, courseType: string) {
    this.metricsService.trackCourseEnrollment(courseId, courseType);
  }

  trackCourseCompletion(courseId: string, courseType: string) {
    this.metricsService.trackCourseCompletion(courseId, courseType);
  }

  trackCourseView(courseId: string) {
    this.metricsService.courseViews.inc({ course_id: courseId });
  }

  // ===== Payment Metrics =====
  trackPayment(status: string, method: string, currency: string, amount: number) {
    this.metricsService.trackPayment(status, method, currency, amount);
  }

  trackPaymentFailure(reason: string, method: string) {
    this.metricsService.trackPaymentFailure(reason, method);
  }

  // ===== Subscription Metrics =====
  trackSubscription(plan: string, status: string) {
    this.metricsService.trackSubscription(plan, status);
  }

  trackSubscriptionCancellation(plan: string, reason: string) {
    this.metricsService.trackSubscriptionCancellation(plan, reason);
  }

  // ===== Content Metrics =====
  trackContentUpload(type: string, status: string) {
    this.metricsService.trackContentUpload(type, status);
  }

  // ===== Forum Metrics =====
  trackForumPost(category: string) {
    this.metricsService.trackForumPost(category);
  }

  trackForumReply(category: string) {
    this.metricsService.trackForumReply(category);
  }

  // ===== Search Metrics =====
  trackSearchQuery(type: string, hasResults: boolean) {
    this.metricsService.trackSearchQuery(type, hasResults);
  }

  // ===== Notification Metrics =====
  trackNotification(type: string, channel: string, status: string) {
    this.metricsService.trackNotification(type, channel, status);
  }

  // ===== File Metrics =====
  trackFileUpload(type: string, status: string, size?: number) {
    this.metricsService.trackFileUpload(type, status, size);
  }

  trackFileDownload(type: string, status: string) {
    this.metricsService.trackFileDownload(type, status);
  }

  // ===== Blockchain Metrics =====
  trackBlockchainTransaction(type: string, status: string, duration: number) {
    this.metricsService.trackBlockchainTransaction(type, status, duration);
  }

  trackBlockchainError(type: string, errorType: string) {
    this.metricsService.trackBlockchainError(type, errorType);
  }

  // ===== Email Metrics =====
  trackEmailSent(type: string, status: string) {
    this.metricsService.trackEmailSent(type, status);
  }

  trackEmailFailed(type: string, reason: string) {
    this.metricsService.trackEmailFailed(type, reason);
  }

  // ===== Queue Metrics =====
  trackQueueJob(queue: string, status: string) {
    this.metricsService.trackQueueJob(queue, status);
  }

  trackQueueJobCompleted(queue: string) {
    this.metricsService.trackQueueJobCompleted(queue);
  }

  trackQueueJobFailed(queue: string, errorType: string) {
    this.metricsService.trackQueueJobFailed(queue, errorType);
  }

  // ===== API Metrics =====
  trackApiCall(endpoint: string, method: string, status: number, latency: number) {
    this.metricsService.trackApiCall(endpoint, method, status, latency);
  }

  trackApiError(endpoint: string, method: string, errorType: string, statusCode: number) {
    this.metricsService.trackApiError(endpoint, method, errorType, statusCode);
  }

  trackApiRateLimit(endpoint: string, method: string) {
    this.metricsService.trackApiRateLimit(endpoint, method);
  }

  // ===== Security Metrics =====
  trackLoginAttempt(method: string, status: string) {
    this.metricsService.loginAttempts.inc({ method, status });
  }

  trackLoginSuccess(method: string) {
    this.metricsService.loginSuccess.inc({ method });
  }

  trackLoginFailure(method: string, reason: string) {
    this.metricsService.loginFailures.inc({ method, reason });
  }

  trackAuthFailure(reason: string, endpoint: string) {
    this.metricsService.authFailuresTotal.inc({ reason, endpoint });
  }

  trackRateLimitHit(endpoint: string, ip: string) {
    this.metricsService.rateLimitHitsTotal.inc({ endpoint, ip });
  }

  trackUnauthorizedAccess(endpoint: string, requiredRole: string) {
    this.metricsService.unauthorizedAccessTotal.inc({
      endpoint,
      required_role: requiredRole,
    });
  }

  // ===== Performance Metrics =====
  trackDatabaseQuery(operation: string, table: string, duration: number, status: string) {
    this.metricsService.trackDatabaseQuery(operation, table, duration, status);
  }

  trackCacheHit(cacheType: string, keyPattern: string) {
    this.metricsService.trackCacheHit(cacheType, keyPattern);
  }

  trackCacheMiss(cacheType: string, keyPattern: string) {
    this.metricsService.trackCacheMiss(cacheType, keyPattern);
  }

  trackCacheOperation(operation: string, cacheType: string, status: string) {
    this.metricsService.trackCacheOperation(operation, cacheType, status);
  }

  // ===== Error Metrics =====
  trackError(type: string, severity: string, endpoint?: string, code?: string) {
    this.metricsService.trackError(type, severity, endpoint, code);
  }

  // ===== HTTP Metrics =====
  trackHttpRequest(
    method: string,
    route: string,
    status: number,
    duration: number,
    requestSize?: number,
    responseSize?: number,
  ) {
    this.metricsService.trackHttpRequest(
      method,
      route,
      status,
      duration,
      requestSize,
      responseSize,
    );
  }
}
