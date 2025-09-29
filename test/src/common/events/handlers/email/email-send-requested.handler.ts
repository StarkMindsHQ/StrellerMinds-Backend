import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventHandler, EventHandlerMetadata } from '../../base/event-handler.base';
import { EmailSendRequestedEvent } from '../../domain/email/email-send-requested.event';
import { EmailSentEvent } from '../../domain/email/email-sent.event';
import { EventBusService } from '../../services/event-bus.service';

@Injectable()
export class EmailSendRequestedHandler extends EventHandler<EmailSendRequestedEvent> {
  private readonly logger = new Logger(EmailSendRequestedHandler.name);

  readonly metadata: EventHandlerMetadata = {
    eventType: 'EmailSendRequestedEvent',
    handlerName: 'EmailSendRequestedHandler',
    version: '1.0.0',
    retryPolicy: {
      maxRetries: 3,
      backoffStrategy: 'exponential',
      initialDelay: 1000,
    },
  };

  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
    private readonly eventBus: EventBusService,
  ) {
    super();
  }

  async handle(event: EmailSendRequestedEvent): Promise<void> {
    const payload = event.getPayload();
    const context = this.getEventContext(event);

    this.logger.debug('Processing email send request', {
      emailId: payload.emailId,
      to: payload.to,
      templateName: payload.templateName,
      ...context,
    });

    try {
      // Check if email should be sent immediately or scheduled
      const delay = payload.scheduledAt 
        ? Math.max(0, payload.scheduledAt.getTime() - Date.now())
        : 0;

      // Queue email for processing
      const job = await this.emailQueue.add(
        'send-email',
        {
          emailId: payload.emailId,
          to: payload.to,
          cc: payload.cc,
          bcc: payload.bcc,
          subject: payload.subject,
          templateName: payload.templateName,
          templateData: payload.templateData,
          attachments: payload.attachments,
          metadata: payload.metadata,
          correlationId: context.correlationId,
        },
        {
          delay,
          priority: this.getPriority(payload.priority),
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );

      this.logger.debug('Email queued successfully', {
        emailId: payload.emailId,
        jobId: job.id,
        delay,
        priority: payload.priority,
        ...context,
      });

      // Publish email queued event for tracking
      await this.eventBus.publish(
        new EmailSentEvent(
          {
            emailId: payload.emailId,
            to: payload.to,
            cc: payload.cc,
            bcc: payload.bcc,
            subject: payload.subject,
            templateName: payload.templateName,
            sentAt: new Date(),
            messageId: `queued-${job.id}`,
            provider: 'queue',
            deliveryStatus: 'sent',
            metadata: {
              ...payload.metadata,
              processingTime: 0,
              retryCount: 0,
              jobId: job.id,
              queuedAt: new Date().toISOString(),
            },
          },
          {
            correlationId: context.correlationId,
            causationId: event.eventId,
          },
        ),
      );

    } catch (error) {
      this.logger.error('Failed to queue email', {
        emailId: payload.emailId,
        error: error.message,
        ...context,
      });

      // Publish email failed event
      await this.eventBus.publish(
        new EmailSentEvent(
          {
            emailId: payload.emailId,
            to: payload.to,
            cc: payload.cc,
            bcc: payload.bcc,
            subject: payload.subject,
            templateName: payload.templateName,
            sentAt: new Date(),
            messageId: '',
            provider: 'queue',
            deliveryStatus: 'failed',
            metadata: {
              ...payload.metadata,
              processingTime: 0,
              retryCount: 0,
              error: error.message,
            },
          },
          {
            correlationId: context.correlationId,
            causationId: event.eventId,
          },
        ),
      );

      throw error;
    }
  }

  private getPriority(priority: string): number {
    switch (priority) {
      case 'urgent':
        return 10;
      case 'high':
        return 5;
      case 'normal':
        return 0;
      case 'low':
        return -5;
      default:
        return 0;
    }
  }
}
