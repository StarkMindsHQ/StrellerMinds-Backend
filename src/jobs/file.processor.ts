import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

export const FILE_QUEUE = 'file-processing';

export interface FileProcessingJobData {
  fileKey: string;
  userId: string;
  operation: 'resize' | 'convert' | 'compress';
}

@Processor(FILE_QUEUE)
export class FileProcessor {
  private readonly logger = new Logger(FileProcessor.name);

  @Process('process')
  async handleFileProcessing(job: Job<FileProcessingJobData>): Promise<void> {
    const { fileKey, operation } = job.data;
    this.logger.log(`Processing file job ${job.id}: ${operation} on ${fileKey}`);
    // Actual file processing logic goes here
  }
}
