export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

export enum JobPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3,
}

export interface JobData {
  id: string;
  name: string;
  payload: any;
  status: JobStatus;
  priority: JobPriority;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  error?: string;
  workerId?: string;
}

export class Job implements JobData {
  id: string;
  name: string;
  payload: any;
  status: JobStatus;
  priority: JobPriority;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  error?: string;
  workerId?: string;

  constructor(partial: Partial<Job>) {
    Object.assign(this, partial);
    this.id = partial.id || Math.random().toString(36).substring(7);
    this.status = partial.status || JobStatus.PENDING;
    this.priority = partial.priority ?? JobPriority.MEDIUM;
    this.attempts = partial.attempts || 0;
    this.maxAttempts = partial.maxAttempts || 3;
    this.createdAt = partial.createdAt || new Date();
  }
}
