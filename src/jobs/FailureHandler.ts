import { Injectable, Logger } from '@nestjs/common';
import { Job, JobStatus, JobPriority } from '../models/Job';

@Injectable()
export class FailureHandler {
  private readonly logger = new Logger(FailureHandler.name);

  /**
   * Handles a failed job and determines if it should be retried.
   */
  handleFailure(job: Job, error: Error): void {
    job.attempts++;
    job.error = error.message;

    if (job.attempts < job.maxAttempts) {
      this.logger.warn(`Job ${job.id} failed (attempt ${job.attempts}). Retrying...`);
      job.status = JobStatus.RETRYING;
      this.rescheduleJob(job);
    } else {
      this.logger.error(`Job ${job.id} failed permanently after ${job.attempts} attempts.`);
      job.status = JobStatus.FAILED;
      this.notifyFailure(job);
    }
  }

  private rescheduleJob(job: Job): void {
    // Increase priority of retried jobs to prevent starvation
    if (job.priority < JobPriority.CRITICAL) {
      job.priority++;
    }
    
    // Logic for exponential backoff would go here
    const backoffDelay = Math.pow(2, job.attempts) * 1000;
    this.logger.log(`Job ${job.id} rescheduled with ${backoffDelay}ms backoff.`);
  }

  private notifyFailure(job: Job): void {
    // Logic for notifying administrators or logging to a specialized service
    this.logger.error(`Final failure for job: ${job.name} (ID: ${job.id}). Reason: ${job.error}`);
  }

  /**
   * Recovers jobs that were stuck in the PROCESSING state (e.g., due to worker crash).
   */
  recoverStuckJobs(jobs: Job[]): Job[] {
    const stuckJobs = jobs.filter(j => j.status === JobStatus.PROCESSING);
    if (stuckJobs.length > 0) {
      this.logger.log(`Recovering ${stuckJobs.length} stuck jobs.`);
      stuckJobs.forEach(j => j.status = JobStatus.RETRYING);
    }
    return stuckJobs;
  }
}
