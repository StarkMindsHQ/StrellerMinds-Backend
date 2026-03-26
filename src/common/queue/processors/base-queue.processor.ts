import { Logger, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job, Worker } from 'bullmq';
import { DeadLetterQueueService } from '../services/dead-letter-queue.service';

export interface OrderedJobData {
  sequenceId?: string; // For ordering within a group
  groupId?: string; // For grouping related jobs
  priority?: number;
  timestamp?: number;
}

export abstract class BaseQueueProcessor {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    @InjectQueue('dead-letter') protected deadLetterQueue: Queue,
    protected dlqService: DeadLetterQueueService,
  ) {}

  /**
   * Process a job with ordering guarantees and error handling
   */
  protected async processJobWithOrdering<T extends OrderedJobData>(
    job: Job<T>,
    processor: (data: T) => Promise<any>,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Check if this job should be processed in order
      if (job.data.groupId && job.data.sequenceId) {
        await this.ensureOrdering(job);
      }

      const result = await processor(job.data);

      const processingTime = Date.now() - startTime;
      this.logger.debug(`Job ${job.id} processed successfully in ${processingTime}ms`);

      return result;
    } catch (error) {
      await this.handleJobFailure(job, error);
      throw error; // Re-throw to let Bull handle retry logic
    }
  }

  /**
   * Ensure jobs are processed in the correct order within a group
   */
  private async ensureOrdering<T extends OrderedJobData>(job: Job<T>): Promise<void> {
    const { groupId, sequenceId } = job.data;

    // If queue property is protected, we use a fallback cast to access it safely
    const queue = (job as any).queue as Queue;
    if (!queue) {
      this.logger.warn('Unable to resolve queue from job for ordering. Skipping ordering enforcement.');
      return;
    }

    // Get all waiting jobs in the same group
    const waitingJobs = await queue.getWaiting(0, 100);
    const groupJobs = waitingJobs
      .filter((j) => (j.data as OrderedJobData).groupId === groupId)
      .sort((a, b) => {
        const seqA = (a.data as OrderedJobData).sequenceId || '';
        const seqB = (b.data as OrderedJobData).sequenceId || '';
        return seqA.localeCompare(seqB);
      });

    // Check if this job is the next in sequence
    const currentIndex = groupJobs.findIndex((j) => j.id === job.id);
    if (currentIndex > 0) {
      // There are jobs that should be processed before this one
      this.logger.debug(
        `Job ${job.id} waiting for ${currentIndex} previous jobs in group ${groupId}`,
      );

      // Wait for previous jobs to complete or fail
      await this.waitForPreviousJobs(groupJobs.slice(0, currentIndex));
    }
  }

  /**
   * Wait for previous jobs in the sequence to complete
   */
  private async waitForPreviousJobs(jobs: Job[]): Promise<void> {
    const checkInterval = 1000; // 1 second
    const maxWaitTime = 300000; // 5 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const completedJobs = await Promise.all(
        jobs.map(async (job) => {
          const state = await job.getState();
          return state === 'completed' || state === 'failed';
        }),
      );

      if (completedJobs.every((completed) => completed)) {
        break; // All previous jobs are done
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }
  }

  /**
   * Handle job failure with dead letter queue integration
   */
  private async handleJobFailure(job: Job, error: Error): Promise<void> {
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);

    // Check if job should be moved to dead letter queue
    const shouldMoveToDLQ = await this.shouldMoveToDeadLetter(job, error);

    if (shouldMoveToDLQ) {
      const queue = (job as any).queue as Queue;
      await this.dlqService.moveToDeadLetter(queue, job, error);
    }
  }

  /**
   * Determine if a failed job should be moved to the dead letter queue
   */
  protected async shouldMoveToDeadLetter(job: Job, error: Error): Promise<boolean> {
    // Move to DLQ if:
    // 1. Job has exceeded maximum retry attempts
    // 2. Error is not recoverable (e.g., validation errors, not network issues)
    // 3. Job is older than a certain age

    const maxRetries = job.opts.attempts || 3;
    const isLastAttempt = job.attemptsMade >= maxRetries;

    const isRecoverableError = this.isRecoverableError(error);

    const jobAge = Date.now() - (job.timestamp || Date.now());
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const isTooOld = jobAge > maxAge;

    return isLastAttempt || !isRecoverableError || isTooOld;
  }

  /**
   * Check if an error is recoverable (should be retried)
   */
  private isRecoverableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();

    // Network-related errors are usually recoverable
    const recoverablePatterns = [
      'timeout',
      'connection refused',
      'network',
      'econnrefused',
      'enotfound',
      'econnreset',
      'temporary failure',
    ];

    // Application errors are usually not recoverable
    const nonRecoverablePatterns = [
      'validation',
      'invalid',
      'unauthorized',
      'forbidden',
      'not found',
      'bad request',
    ];

    const isRecoverable = recoverablePatterns.some((pattern) => errorMessage.includes(pattern));

    const isNonRecoverable = nonRecoverablePatterns.some((pattern) =>
      errorMessage.includes(pattern),
    );

    return isRecoverable && !isNonRecoverable;
  }

  /**
   * Add a job with ordering support
   */
  protected async addOrderedJob(
    queue: Queue,
    jobName: string,
    data: OrderedJobData,
    options: {
      priority?: number;
      delay?: number;
      attempts?: number;
      backoff?: any;
    } = {},
  ): Promise<Job> {
    // Set default ordering fields if not provided
    if (data.groupId && !data.sequenceId) {
      data.sequenceId = Date.now().toString();
    }

    if (!data.timestamp) {
      data.timestamp = Date.now();
    }

    return queue.add(jobName, data, {
      priority: data.priority || options.priority || 0,
      delay: options.delay,
      attempts: options.attempts || 3,
      backoff: options.backoff || { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  /**
   * Get job statistics for monitoring
   */
  protected async getJobStats(queue: Queue): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }
}
