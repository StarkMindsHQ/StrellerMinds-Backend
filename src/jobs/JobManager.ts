import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueProcessor } from './QueueProcessor';
import { FailureHandler } from './FailureHandler';
import { Job, JobData, JobPriority, JobStatus } from '../models/Job';

@Injectable()
export class JobManager implements OnModuleInit {
  private readonly logger = new Logger(JobManager.name);
  private jobs: Map<string, Job> = new Map();

  constructor(
    private readonly queueProcessor: QueueProcessor,
    private readonly failureHandler: FailureHandler,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing Background Job Manager');
    this.startPeriodicCleanup();
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupCompletedJobs();
    }, 3600000); // Cleanup every hour
  }

  /**
   * Creates and enqueues a new background job.
   */
  async createJob(name: string, payload: any, priority: JobPriority = JobPriority.MEDIUM): Promise<Job> {
    const job = new Job({
      name,
      payload,
      priority,
      status: JobStatus.PENDING,
      maxAttempts: 3,
      createdAt: new Date(),
    });

    this.jobs.set(job.id, job);
    await this.queueProcessor.enqueue(job);
    
    return job;
  }

  /**
   * Retrieves a job by its ID.
   */
  getJobById(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /**
   * Retrieves all background jobs by status.
   */
  getJobsByStatus(status: JobStatus): Job[] {
    return Array.from(this.jobs.values()).filter(j => j.status === status);
  }

  /**
   * Removes completed background jobs from memory.
   */
  cleanupCompletedJobs(): void {
    const originalCount = this.jobs.size;
    const completedJobs = Array.from(this.jobs.values()).filter(j => j.status === JobStatus.COMPLETED);
    
    completedJobs.forEach(j => this.jobs.delete(j.id));
    this.logger.log(`Background job cleanup: ${completedJobs.length} jobs removed. Remaining: ${this.jobs.size}`);
  }

  /**
   * Performs an automated job recovery operation.
   */
  recoverJobs(): void {
    this.logger.warn('Triggering semi-automated background job recovery');
    const stuckJobs = this.failureHandler.recoverStuckJobs(Array.from(this.jobs.values()));
    
    stuckJobs.forEach(async (job) => {
      await this.queueProcessor.enqueue(job);
      this.logger.log(`Job recovered and re-enqueued: ${job.id}`);
    });
  }

  /**
   * Monitors performance and active job load.
   */
  getQueueMetrics(): any {
    return this.queueProcessor.getJobMetrics();
  }
}
