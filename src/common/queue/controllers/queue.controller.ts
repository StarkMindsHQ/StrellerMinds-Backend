import { Controller, Get, Post, Param, Body, Put, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { QueueMonitoringService } from '../services/queue-monitoring.service';
import { DeadLetterQueueService } from '../services/dead-letter-queue.service';
import { QueueScalingService } from '../services/queue-scaling.service';

@ApiTags('Queue Management')
@Controller('queue')
export class QueueController {
  constructor(
    private readonly monitoringService: QueueMonitoringService,
    private readonly dlqService: DeadLetterQueueService,
    private readonly scalingService: QueueScalingService,
  ) {}

  @Get('metrics')
  @ApiOperation({
    summary: 'Get queue metrics',
    description:
      'Returns current metrics for all queues including throughput, error rates, and backlog',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue metrics retrieved successfully',
  })
  async getMetrics() {
    return await this.monitoringService.getMetrics();
  }

  @Get('metrics/:queueName')
  @ApiOperation({
    summary: 'Get metrics for specific queue',
    description: 'Returns detailed metrics for a specific queue',
  })
  @ApiParam({ name: 'queueName', description: 'Name of the queue' })
  @ApiResponse({
    status: 200,
    description: 'Queue metrics retrieved successfully',
  })
  async getQueueMetrics(@Param('queueName') queueName: string) {
    return await this.monitoringService.getMetrics(queueName);
  }

  @Get('health')
  @ApiOperation({
    summary: 'Get queue health status',
    description: 'Returns health status and issues for all queues',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue health status retrieved successfully',
  })
  async getHealthStatus() {
    return await this.monitoringService.getHealthStatus();
  }

  @Post(':queueName/pause')
  @ApiOperation({
    summary: 'Pause a queue',
    description: 'Temporarily pauses job processing for the specified queue',
  })
  @ApiParam({ name: 'queueName', description: 'Name of the queue to pause' })
  @ApiResponse({
    status: 200,
    description: 'Queue paused successfully',
  })
  async pauseQueue(@Param('queueName') queueName: string) {
    await this.monitoringService.pauseQueue(queueName);
    return { message: `Queue ${queueName} paused successfully` };
  }

  @Post(':queueName/resume')
  @ApiOperation({
    summary: 'Resume a queue',
    description: 'Resumes job processing for the specified queue',
  })
  @ApiParam({ name: 'queueName', description: 'Name of the queue to resume' })
  @ApiResponse({
    status: 200,
    description: 'Queue resumed successfully',
  })
  async resumeQueue(@Param('queueName') queueName: string) {
    await this.monitoringService.resumeQueue(queueName);
    return { message: `Queue ${queueName} resumed successfully` };
  }

  @Post(':queueName/clean')
  @ApiOperation({
    summary: 'Clean old jobs from queue',
    description: 'Removes completed and failed jobs older than the grace period',
  })
  @ApiParam({ name: 'queueName', description: 'Name of the queue to clean' })
  @ApiResponse({
    status: 200,
    description: 'Queue cleaned successfully',
  })
  async cleanQueue(@Param('queueName') queueName: string) {
    await this.monitoringService.cleanQueue(queueName);
    return { message: `Queue ${queueName} cleaned successfully` };
  }

  @Get('dlq/stats')
  @ApiOperation({
    summary: 'Get dead letter queue statistics',
    description: 'Returns statistics about failed jobs in the dead letter queue',
  })
  @ApiResponse({
    status: 200,
    description: 'DLQ statistics retrieved successfully',
  })
  async getDLQStats() {
    return await this.dlqService.getDeadLetterStats();
  }

  @Get('dlq/jobs')
  @ApiOperation({
    summary: 'Get dead letter queue jobs',
    description: 'Returns list of jobs in the dead letter queue',
  })
  @ApiResponse({
    status: 200,
    description: 'DLQ jobs retrieved successfully',
  })
  async getDLQJobs() {
    return await this.dlqService.getDeadLetterJobs();
  }

  @Post('dlq/retry/:jobId')
  @ApiOperation({
    summary: 'Retry a dead letter job',
    description: 'Moves a job from dead letter queue back to its original queue for retry',
  })
  @ApiParam({ name: 'jobId', description: 'ID of the DLQ job to retry' })
  @ApiResponse({
    status: 200,
    description: 'Job retry initiated successfully',
  })
  async retryDLQJob(@Param('jobId') jobId: string) {
    const success = await this.dlqService.retryDeadLetterJob(jobId);
    if (success) {
      return { message: `Job ${jobId} retry initiated successfully` };
    } else {
      return { message: `Failed to retry job ${jobId}` };
    }
  }

  @Post('dlq/bulk-retry')
  @ApiOperation({
    summary: 'Bulk retry dead letter jobs',
    description: 'Retries all dead letter jobs for a specific queue or all queues',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk retry completed',
  })
  async bulkRetryDLQJobs(@Body() body: { queueName?: string }) {
    const count = await this.dlqService.bulkRetryDeadLetterJobs(body.queueName);
    return { message: `Retried ${count} dead letter jobs successfully` };
  }

  @Delete('dlq/clean')
  @ApiOperation({
    summary: 'Clean old dead letter jobs',
    description: 'Removes old dead letter jobs based on age threshold',
  })
  @ApiResponse({
    status: 200,
    description: 'DLQ cleaned successfully',
  })
  async cleanDLQ(@Body() body: { olderThanDays?: number }) {
    const days = body.olderThanDays || 30;
    const count = await this.dlqService.cleanOldDeadLetterJobs(days);
    return { message: `Cleaned ${count} old dead letter jobs` };
  }

  @Get('scaling/status')
  @ApiOperation({
    summary: 'Get queue scaling status',
    description: 'Returns current scaling status for all queues',
  })
  @ApiResponse({
    status: 200,
    description: 'Scaling status retrieved successfully',
  })
  async getScalingStatus() {
    return await this.scalingService.getScalingStatus();
  }

  @Post('scaling/:queueName')
  @ApiOperation({
    summary: 'Manually scale a queue',
    description: 'Manually adjusts the number of workers for a specific queue',
  })
  @ApiParam({ name: 'queueName', description: 'Name of the queue to scale' })
  @ApiResponse({
    status: 200,
    description: 'Queue scaling initiated successfully',
  })
  async manualScale(
    @Param('queueName') queueName: string,
    @Body() body: { targetWorkers: number },
  ) {
    const success = await this.scalingService.manualScale(queueName, body.targetWorkers);
    if (success) {
      return { message: `Queue ${queueName} scaled to ${body.targetWorkers} workers` };
    } else {
      return { message: `Failed to scale queue ${queueName}` };
    }
  }
}
