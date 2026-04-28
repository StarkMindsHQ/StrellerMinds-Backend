import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EMAIL_QUEUE, SendEmailJobData } from './email.processor';
import { FILE_QUEUE, FileProcessingJobData } from './file.processor';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
    @InjectQueue(FILE_QUEUE) private readonly fileQueue: Queue,
  ) {}

  async queueEmail(data: SendEmailJobData) {
    return this.emailQueue.add('send', data, { attempts: 3, backoff: 5000 });
  }

  async queueFileProcessing(data: FileProcessingJobData) {
    return this.fileQueue.add('process', data, { attempts: 2, backoff: 3000 });
  }
}
