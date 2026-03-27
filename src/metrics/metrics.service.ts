import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  Counter,
  Gauge,
  Histogram,
  Summary,
  collectDefaultMetrics,
  AggregatorRegistry,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: Registry;
  private readonly aggregatorRegistry: AggregatorRegistry;

  // ===== HTTP Metrics =====
  public readonly httpRequestsTotal: Counter<string>;
  public readonly httpRequestDuration: Histogram<string>;
  public readonly httpRequestSize: Summary<string>;
  public readonly httpResponseSize: Summary<string>;
  public readonly activeConnections: Gauge<string>;

  // ===== Error Metrics =====
  public readonly errorTotal: Counter<string>;
  public readonly errorRate: Gauge<string>;
  public readonly errorsByType: Counter<string>;
  public readonly errorsByEndpoint: Counter<string>;

  // ===== Security Metrics =====
  public readonly authFailuresTotal: Counter<string>;
  public readonly rateLimitHitsTotal: Counter<string>;
  public readonly unauthorizedAccessTotal: Counter<string>;
  public readonly loginAttempts: Counter<string>;
  public readonly loginSuccess: Counter<string>;
  public readonly loginFailures: Counter<string>;

  // ===== Business Metrics =====
  public readonly userRegistrations: Counter<string>;
  public readonly userLogins: Counter<string>;
  public readonly activeUsers: Gauge<string>;
  public readonly courseEnrollments: Counter<string>;
  public readonly courseCompletions: Counter<string>;
  public readonly courseViews: Counter<string>;
  public readonly paymentsTotal: Counter<string>;
  public readonly paymentAmount: Counter<string>;
  public readonly paymentFailures: Counter<string>;
  public readonly subscriptions: Counter<string>;
  public readonly subscriptionCancellations: Counter<string>;
  public readonly contentUploads: Counter<string>;
  public readonly forumPosts: Counter<string>;
  public readonly forumReplies: Counter<string>;
  public readonly searchQueries: Counter<string>;
  public readonly notificationsSent: Counter<string>;

  // ===== Performance Metrics =====
  public readonly databaseQueryDuration: Histogram<string>;
  public readonly databaseQueryTotal: Counter<string>;
  public readonly databaseConnections: Gauge<string>;
  public readonly cacheHits: Counter<string>;
  public readonly cacheMisses: Counter<string>;
  public readonly cacheHitRate: Gauge<string>;
  public readonly cacheSize: Gauge<string>;
  public readonly cacheOperations: Counter<string>;
  public readonly eventLoopLag: Gauge<string>;
  public readonly gcDuration: Histogram<string>;
  public readonly heapSize: Gauge<string>;
  public readonly heapUsed: Gauge<string>;
  public readonly externalMemory: Gauge<string>;
  public readonly rss: Gauge<string>;
  public readonly cpuUsage: Gauge<string>;

  // ===== API Metrics =====
  public readonly apiLatency: Histogram<string>;
  public readonly apiCalls: Counter<string>;
  public readonly apiErrors: Counter<string>;
  public readonly apiRateLimit: Counter<string>;

  // ===== Queue Metrics =====
  public readonly queueJobsTotal: Counter<string>;
  public readonly queueJobsActive: Gauge<string>;
  public readonly queueJobsWaiting: Gauge<string>;
  public readonly queueJobsCompleted: Counter<string>;
  public readonly queueJobsFailed: Counter<string>;
  public readonly queueProcessingDuration: Histogram<string>;

  // ===== Email Metrics =====
  public readonly emailsSent: Counter<string>;
  public readonly emailsFailed: Counter<string>;
  public readonly emailDeliveryDuration: Histogram<string>;

  // ===== File Metrics =====
  public readonly fileUploads: Counter<string>;
  public readonly fileDownloads: Counter<string>;
  public readonly fileSize: Summary<string>;
  public readonly storageUsed: Gauge<string>;

  // ===== Blockchain Metrics =====
  public readonly blockchainTransactions: Counter<string>;
  public readonly blockchainTransactionDuration: Histogram<string>;
  public readonly blockchainErrors: Counter<string>;

  constructor() {
    this.registry = new Registry();
    this.aggregatorRegistry = new AggregatorRegistry();

    // Collect default Node.js metrics
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'nestjs_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });

    // Initialize HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestSize = new Summary({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      percentiles: [0.5, 0.9, 0.95, 0.99],
      registers: [this.registry],
    });

    this.httpResponseSize = new Summary({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route'],
      percentiles: [0.5, 0.9, 0.95, 0.99],
      registers: [this.registry],
    });

    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.registry],
    });

    // Initialize Error Metrics
    this.errorTotal = new Counter({
      name: 'errors_total',
      help: 'Total number of application errors',
      labelNames: ['type', 'severity', 'endpoint'],
      registers: [this.registry],
    });

    this.errorRate = new Gauge({
      name: 'error_rate',
      help: 'Error rate (errors per minute)',
      registers: [this.registry],
    });

    this.errorsByType = new Counter({
      name: 'errors_by_type_total',
      help: 'Total errors by type',
      labelNames: ['type', 'code'],
      registers: [this.registry],
    });

    this.errorsByEndpoint = new Counter({
      name: 'errors_by_endpoint_total',
      help: 'Total errors by endpoint',
      labelNames: ['endpoint', 'method', 'status_code'],
      registers: [this.registry],
    });

    // Initialize Security Metrics
    this.authFailuresTotal = new Counter({
      name: 'security_auth_failures_total',
      help: 'Total number of authentication failures',
      labelNames: ['reason', 'endpoint'],
      registers: [this.registry],
    });

    this.rateLimitHitsTotal = new Counter({
      name: 'security_rate_limit_hits_total',
      help: 'Total number of rate limit hits',
      labelNames: ['endpoint', 'ip'],
      registers: [this.registry],
    });

    this.unauthorizedAccessTotal = new Counter({
      name: 'security_unauthorized_access_total',
      help: 'Total number of unauthorized access attempts',
      labelNames: ['endpoint', 'required_role'],
      registers: [this.registry],
    });

    this.loginAttempts = new Counter({
      name: 'login_attempts_total',
      help: 'Total number of login attempts',
      labelNames: ['method', 'status'],
      registers: [this.registry],
    });

    this.loginSuccess = new Counter({
      name: 'login_success_total',
      help: 'Total number of successful logins',
      labelNames: ['method'],
      registers: [this.registry],
    });

    this.loginFailures = new Counter({
      name: 'login_failures_total',
      help: 'Total number of failed logins',
      labelNames: ['method', 'reason'],
      registers: [this.registry],
    });

    // Initialize Business Metrics
    this.userRegistrations = new Counter({
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['source', 'method'],
      registers: [this.registry],
    });

    this.userLogins = new Counter({
      name: 'user_logins_total',
      help: 'Total number of user logins',
      labelNames: ['method'],
      registers: [this.registry],
    });

    this.activeUsers = new Gauge({
      name: 'active_users',
      help: 'Number of currently active users',
      registers: [this.registry],
    });

    this.courseEnrollments = new Counter({
      name: 'course_enrollments_total',
      help: 'Total number of course enrollments',
      labelNames: ['course_id', 'course_type'],
      registers: [this.registry],
    });

    this.courseCompletions = new Counter({
      name: 'course_completions_total',
      help: 'Total number of course completions',
      labelNames: ['course_id', 'course_type'],
      registers: [this.registry],
    });

    this.courseViews = new Counter({
      name: 'course_views_total',
      help: 'Total number of course views',
      labelNames: ['course_id'],
      registers: [this.registry],
    });

    this.paymentsTotal = new Counter({
      name: 'payments_total',
      help: 'Total number of payments',
      labelNames: ['status', 'method', 'currency'],
      registers: [this.registry],
    });

    this.paymentAmount = new Counter({
      name: 'payment_amount_total',
      help: 'Total payment amount',
      labelNames: ['currency', 'method'],
      registers: [this.registry],
    });

    this.paymentFailures = new Counter({
      name: 'payment_failures_total',
      help: 'Total number of payment failures',
      labelNames: ['reason', 'method'],
      registers: [this.registry],
    });

    this.subscriptions = new Counter({
      name: 'subscriptions_total',
      help: 'Total number of subscriptions',
      labelNames: ['plan', 'status'],
      registers: [this.registry],
    });

    this.subscriptionCancellations = new Counter({
      name: 'subscription_cancellations_total',
      help: 'Total number of subscription cancellations',
      labelNames: ['plan', 'reason'],
      registers: [this.registry],
    });

    this.contentUploads = new Counter({
      name: 'content_uploads_total',
      help: 'Total number of content uploads',
      labelNames: ['type', 'status'],
      registers: [this.registry],
    });

    this.forumPosts = new Counter({
      name: 'forum_posts_total',
      help: 'Total number of forum posts',
      labelNames: ['category'],
      registers: [this.registry],
    });

    this.forumReplies = new Counter({
      name: 'forum_replies_total',
      help: 'Total number of forum replies',
      labelNames: ['category'],
      registers: [this.registry],
    });

    this.searchQueries = new Counter({
      name: 'search_queries_total',
      help: 'Total number of search queries',
      labelNames: ['type', 'has_results'],
      registers: [this.registry],
    });

    this.notificationsSent = new Counter({
      name: 'notifications_sent_total',
      help: 'Total number of notifications sent',
      labelNames: ['type', 'channel', 'status'],
      registers: [this.registry],
    });

    // Initialize Performance Metrics
    this.databaseQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.databaseQueryTotal = new Counter({
      name: 'database_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table', 'status'],
      registers: [this.registry],
    });

    this.databaseConnections = new Gauge({
      name: 'database_connections',
      help: 'Number of active database connections',
      labelNames: ['state'],
      registers: [this.registry],
    });

    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type', 'key_pattern'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type', 'key_pattern'],
      registers: [this.registry],
    });

    this.cacheHitRate = new Gauge({
      name: 'cache_hit_rate',
      help: 'Cache hit rate (0-1)',
      labelNames: ['cache_type'],
      registers: [this.registry],
    });

    this.cacheSize = new Gauge({
      name: 'cache_size_bytes',
      help: 'Cache size in bytes',
      labelNames: ['cache_type'],
      registers: [this.registry],
    });

    this.cacheOperations = new Counter({
      name: 'cache_operations_total',
      help: 'Total cache operations',
      labelNames: ['operation', 'cache_type', 'status'],
      registers: [this.registry],
    });

    this.eventLoopLag = new Gauge({
      name: 'event_loop_lag_seconds',
      help: 'Event loop lag in seconds',
      registers: [this.registry],
    });

    this.gcDuration = new Histogram({
      name: 'gc_duration_seconds',
      help: 'Garbage collection duration in seconds',
      labelNames: ['gc_type'],
      buckets: [0.001, 0.01, 0.1, 1, 2, 5],
      registers: [this.registry],
    });

    this.heapSize = new Gauge({
      name: 'heap_size_bytes',
      help: 'Total heap size in bytes',
      registers: [this.registry],
    });

    this.heapUsed = new Gauge({
      name: 'heap_used_bytes',
      help: 'Used heap size in bytes',
      registers: [this.registry],
    });

    this.externalMemory = new Gauge({
      name: 'external_memory_bytes',
      help: 'External memory in bytes',
      registers: [this.registry],
    });

    this.rss = new Gauge({
      name: 'rss_bytes',
      help: 'Resident set size in bytes',
      registers: [this.registry],
    });

    this.cpuUsage = new Gauge({
      name: 'cpu_usage_percent',
      help: 'CPU usage percentage',
      labelNames: ['type'],
      registers: [this.registry],
    });

    // Initialize API Metrics
    this.apiLatency = new Histogram({
      name: 'api_latency_seconds',
      help: 'API latency in seconds',
      labelNames: ['endpoint', 'method', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.apiCalls = new Counter({
      name: 'api_calls_total',
      help: 'Total number of API calls',
      labelNames: ['endpoint', 'method', 'status'],
      registers: [this.registry],
    });

    this.apiErrors = new Counter({
      name: 'api_errors_total',
      help: 'Total number of API errors',
      labelNames: ['endpoint', 'method', 'error_type', 'status_code'],
      registers: [this.registry],
    });

    this.apiRateLimit = new Counter({
      name: 'api_rate_limit_total',
      help: 'Total number of API rate limit hits',
      labelNames: ['endpoint', 'method'],
      registers: [this.registry],
    });

    // Initialize Queue Metrics
    this.queueJobsTotal = new Counter({
      name: 'queue_jobs_total',
      help: 'Total number of queue jobs',
      labelNames: ['queue', 'status'],
      registers: [this.registry],
    });

    this.queueJobsActive = new Gauge({
      name: 'queue_jobs_active',
      help: 'Number of active queue jobs',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueJobsWaiting = new Gauge({
      name: 'queue_jobs_waiting',
      help: 'Number of waiting queue jobs',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueJobsCompleted = new Counter({
      name: 'queue_jobs_completed_total',
      help: 'Total number of completed queue jobs',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueJobsFailed = new Counter({
      name: 'queue_jobs_failed_total',
      help: 'Total number of failed queue jobs',
      labelNames: ['queue', 'error_type'],
      registers: [this.registry],
    });

    this.queueProcessingDuration = new Histogram({
      name: 'queue_processing_duration_seconds',
      help: 'Queue job processing duration in seconds',
      labelNames: ['queue', 'job_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.registry],
    });

    // Initialize Email Metrics
    this.emailsSent = new Counter({
      name: 'emails_sent_total',
      help: 'Total number of emails sent',
      labelNames: ['type', 'status'],
      registers: [this.registry],
    });

    this.emailsFailed = new Counter({
      name: 'emails_failed_total',
      help: 'Total number of failed emails',
      labelNames: ['type', 'reason'],
      registers: [this.registry],
    });

    this.emailDeliveryDuration = new Histogram({
      name: 'email_delivery_duration_seconds',
      help: 'Email delivery duration in seconds',
      labelNames: ['type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });

    // Initialize File Metrics
    this.fileUploads = new Counter({
      name: 'file_uploads_total',
      help: 'Total number of file uploads',
      labelNames: ['type', 'status'],
      registers: [this.registry],
    });

    this.fileDownloads = new Counter({
      name: 'file_downloads_total',
      help: 'Total number of file downloads',
      labelNames: ['type', 'status'],
      registers: [this.registry],
    });

    this.fileSize = new Summary({
      name: 'file_size_bytes',
      help: 'File size in bytes',
      labelNames: ['type'],
      percentiles: [0.5, 0.9, 0.95, 0.99],
      registers: [this.registry],
    });

    this.storageUsed = new Gauge({
      name: 'storage_used_bytes',
      help: 'Total storage used in bytes',
      labelNames: ['type'],
      registers: [this.registry],
    });

    // Initialize Blockchain Metrics
    this.blockchainTransactions = new Counter({
      name: 'blockchain_transactions_total',
      help: 'Total number of blockchain transactions',
      labelNames: ['type', 'status'],
      registers: [this.registry],
    });

    this.blockchainTransactionDuration = new Histogram({
      name: 'blockchain_transaction_duration_seconds',
      help: 'Blockchain transaction duration in seconds',
      labelNames: ['type'],
      buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
      registers: [this.registry],
    });

    this.blockchainErrors = new Counter({
      name: 'blockchain_errors_total',
      help: 'Total number of blockchain errors',
      labelNames: ['type', 'error_type'],
      registers: [this.registry],
    });
  }

  onModuleInit() {
    // Start collecting system metrics
    this.collectSystemMetrics();
  }

  private collectSystemMetrics() {
    // Update heap metrics every 10 seconds
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.heapSize.set(memUsage.heapTotal);
      this.heapUsed.set(memUsage.heapUsed);
      this.externalMemory.set(memUsage.external);
      this.rss.set(memUsage.rss);
    }, 10000);

    // Update CPU usage every 10 seconds
    setInterval(() => {
      const cpuUsage = process.cpuUsage();
      const totalUsage = cpuUsage.user + cpuUsage.system;
      this.cpuUsage.set({ type: 'user' }, cpuUsage.user / 1000000); // Convert to seconds
      this.cpuUsage.set({ type: 'system' }, cpuUsage.system / 1000000);
    }, 10000);

    // Update event loop lag every 5 seconds
    setInterval(() => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1e9; // Convert to seconds
        this.eventLoopLag.set(lag);
      });
    }, 5000);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  async getMetricsAsJson(): Promise<object> {
    const metrics = await this.registry.getMetricsAsJSON();
    return metrics;
  }

  async getMetricsAsPrometheus(): Promise<string> {
    return this.registry.metrics();
  }

  // Helper method to track HTTP request
  trackHttpRequest(
    method: string,
    route: string,
    status: number,
    duration: number,
    requestSize?: number,
    responseSize?: number,
  ) {
    const statusCode = status.toString();
    const statusCategory = `${Math.floor(status / 100)}xx`;

    this.httpRequestsTotal.inc({
      method,
      route,
      status: statusCategory,
      status_code: statusCode,
    });

    this.httpRequestDuration.observe({ method, route, status: statusCategory }, duration);

    if (requestSize) {
      this.httpRequestSize.observe({ method, route }, requestSize);
    }

    if (responseSize) {
      this.httpResponseSize.observe({ method, route }, responseSize);
    }
  }

  // Helper method to track errors
  trackError(type: string, severity: string, endpoint?: string, code?: string) {
    this.errorTotal.inc({ type, severity, endpoint: endpoint || 'unknown' });
    this.errorsByType.inc({ type, code: code || 'unknown' });
  }

  // Helper method to track business events
  trackUserRegistration(source: string, method: string) {
    this.userRegistrations.inc({ source, method });
  }

  trackUserLogin(method: string) {
    this.userLogins.inc({ method });
  }

  trackCourseEnrollment(courseId: string, courseType: string) {
    this.courseEnrollments.inc({ course_id: courseId, course_type: courseType });
  }

  trackCourseCompletion(courseId: string, courseType: string) {
    this.courseCompletions.inc({ course_id: courseId, course_type: courseType });
  }

  trackPayment(status: string, method: string, currency: string, amount: number) {
    this.paymentsTotal.inc({ status, method, currency });
    this.paymentAmount.inc({ currency, method }, amount);
  }

  trackPaymentFailure(reason: string, method: string) {
    this.paymentFailures.inc({ reason, method });
  }

  // Helper method to track performance
  trackDatabaseQuery(operation: string, table: string, duration: number, status: string) {
    this.databaseQueryDuration.observe({ operation, table, status }, duration);
    this.databaseQueryTotal.inc({ operation, table, status });
  }

  trackCacheHit(cacheType: string, keyPattern: string) {
    this.cacheHits.inc({ cache_type: cacheType, key_pattern: keyPattern });
  }

  trackCacheMiss(cacheType: string, keyPattern: string) {
    this.cacheMisses.inc({ cache_type: cacheType, key_pattern: keyPattern });
  }

  trackCacheOperation(operation: string, cacheType: string, status: string) {
    this.cacheOperations.inc({ operation, cache_type: cacheType, status });
  }

  // Helper method to track queue jobs
  trackQueueJob(queue: string, status: string) {
    this.queueJobsTotal.inc({ queue, status });
  }

  trackQueueJobCompleted(queue: string) {
    this.queueJobsCompleted.inc({ queue });
  }

  trackQueueJobFailed(queue: string, errorType: string) {
    this.queueJobsFailed.inc({ queue, error_type: errorType });
  }

  // Helper method to track emails
  trackEmailSent(type: string, status: string) {
    this.emailsSent.inc({ type, status });
  }

  trackEmailFailed(type: string, reason: string) {
    this.emailsFailed.inc({ type, reason });
  }

  // Helper method to track files
  trackFileUpload(type: string, status: string, size?: number) {
    this.fileUploads.inc({ type, status });
    if (size) {
      this.fileSize.observe({ type }, size);
    }
  }

  trackFileDownload(type: string, status: string) {
    this.fileDownloads.inc({ type, status });
  }

  // Helper method to track blockchain
  trackBlockchainTransaction(type: string, status: string, duration: number) {
    this.blockchainTransactions.inc({ type, status });
    this.blockchainTransactionDuration.observe({ type }, duration);
  }

  trackBlockchainError(type: string, errorType: string) {
    this.blockchainErrors.inc({ type, error_type: errorType });
  }

  // Helper method to track search
  trackSearchQuery(type: string, hasResults: boolean) {
    this.searchQueries.inc({ type, has_results: hasResults.toString() });
  }

  // Helper method to track notifications
  trackNotification(type: string, channel: string, status: string) {
    this.notificationsSent.inc({ type, channel, status });
  }

  // Helper method to track forum activity
  trackForumPost(category: string) {
    this.forumPosts.inc({ category });
  }

  trackForumReply(category: string) {
    this.forumReplies.inc({ category });
  }

  // Helper method to track subscriptions
  trackSubscription(plan: string, status: string) {
    this.subscriptions.inc({ plan, status });
  }

  trackSubscriptionCancellation(plan: string, reason: string) {
    this.subscriptionCancellations.inc({ plan, reason });
  }

  // Helper method to track content uploads
  trackContentUpload(type: string, status: string) {
    this.contentUploads.inc({ type, status });
  }

  // Helper method to track API calls
  trackApiCall(endpoint: string, method: string, status: number, latency: number) {
    const statusCode = status.toString();
    this.apiCalls.inc({ endpoint, method, status: statusCode });
    this.apiLatency.observe({ endpoint, method, status: statusCode }, latency);
  }

  trackApiError(endpoint: string, method: string, errorType: string, statusCode: number) {
    this.apiErrors.inc({
      endpoint,
      method,
      error_type: errorType,
      status_code: statusCode.toString(),
    });
  }

  trackApiRateLimit(endpoint: string, method: string) {
    this.apiRateLimit.inc({ endpoint, method });
  }

  // Helper method to update active users
  setActiveUsers(count: number) {
    this.activeUsers.set(count);
  }

  // Helper method to update database connections
  setDatabaseConnections(state: string, count: number) {
    this.databaseConnections.set({ state }, count);
  }

  // Helper method to update cache metrics
  setCacheHitRate(cacheType: string, rate: number) {
    this.cacheHitRate.set({ cache_type: cacheType }, rate);
  }

  setCacheSize(cacheType: string, size: number) {
    this.cacheSize.set({ cache_type: cacheType }, size);
  }

  // Helper method to update queue metrics
  setQueueJobsActive(queue: string, count: number) {
    this.queueJobsActive.set({ queue }, count);
  }

  setQueueJobsWaiting(queue: string, count: number) {
    this.queueJobsWaiting.set({ queue }, count);
  }

  // Helper method to update storage metrics
  setStorageUsed(type: string, bytes: number) {
    this.storageUsed.set({ type }, bytes);
  }

  // Helper method to update error rate
  setErrorRate(rate: number) {
    this.errorRate.set(rate);
  }
}
