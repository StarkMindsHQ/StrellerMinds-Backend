import { Injectable, Logger } from '@nestjs/common';
import { EventHandler, EventHandlerMetadata } from '../../base/event-handler.base';
import { UserRegisteredEvent } from '../../domain/user/user-registered.event';
import { EmailSendRequestedEvent } from '../../domain/email/email-send-requested.event';
import { EventBusService } from '../../services/event-bus.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserRegisteredHandler extends EventHandler<UserRegisteredEvent> {
  private readonly logger = new Logger(UserRegisteredHandler.name);

  readonly metadata: EventHandlerMetadata = {
    eventType: 'UserRegisteredEvent',
    handlerName: 'UserRegisteredHandler',
    version: '1.0.0',
    retryPolicy: {
      maxRetries: 3,
      backoffStrategy: 'exponential',
      initialDelay: 1000,
    },
  };

  constructor(private readonly eventBus: EventBusService) {
    super();
  }

  async handle(event: UserRegisteredEvent): Promise<void> {
    const payload = event.getPayload();
    const context = this.getEventContext(event);

    this.logger.debug('Processing user registration', {
      userId: payload.userId,
      email: payload.email,
      registrationMethod: payload.registrationMethod,
      ...context,
    });

    try {
      // Send welcome email if email registration and not already verified
      if (payload.registrationMethod === 'email' && !payload.emailVerified) {
        await this.sendWelcomeEmail(payload, context.correlationId, event.eventId);
      }

      // Send verification email if needed
      if (!payload.emailVerified) {
        await this.sendVerificationEmail(payload, context.correlationId, event.eventId);
      }

      // Send onboarding email series
      await this.scheduleOnboardingEmails(payload, context.correlationId, event.eventId);

      // Track registration analytics
      await this.trackRegistrationAnalytics(payload, context.correlationId);

      this.logger.debug('User registration processed successfully', {
        userId: payload.userId,
        ...context,
      });

    } catch (error) {
      this.logger.error('Failed to process user registration', {
        userId: payload.userId,
        error: error.message,
        ...context,
      });
      throw error;
    }
  }

  private async sendWelcomeEmail(
    payload: any,
    correlationId: string,
    causationId: string,
  ): Promise<void> {
    const emailEvent = new EmailSendRequestedEvent(
      {
        emailId: uuidv4(),
        to: payload.email,
        subject: 'Welcome to StrellerMinds!',
        templateName: 'welcome',
        templateData: {
          name: payload.name,
          firstName: payload.profileData?.firstName || payload.name,
          registrationMethod: payload.registrationMethod,
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
          supportUrl: `${process.env.FRONTEND_URL}/support`,
        },
        priority: 'high',
        metadata: {
          source: 'user-registration',
          category: 'welcome',
          tags: ['welcome', 'onboarding'],
          trackingEnabled: true,
          userId: payload.userId,
        },
      },
      {
        correlationId,
        causationId,
        userId: payload.userId,
      },
    );

    await this.eventBus.publish(emailEvent);
  }

  private async sendVerificationEmail(
    payload: any,
    correlationId: string,
    causationId: string,
  ): Promise<void> {
    const verificationToken = this.generateVerificationToken();
    
    const emailEvent = new EmailSendRequestedEvent(
      {
        emailId: uuidv4(),
        to: payload.email,
        subject: 'Verify Your Email Address',
        templateName: 'email-verification',
        templateData: {
          name: payload.name,
          verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`,
          verificationCode: verificationToken.slice(-6).toUpperCase(),
          expiryHours: 24,
        },
        priority: 'high',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        metadata: {
          source: 'user-registration',
          category: 'verification',
          tags: ['verification', 'security'],
          trackingEnabled: true,
          userId: payload.userId,
          verificationToken,
        },
      },
      {
        correlationId,
        causationId,
        userId: payload.userId,
      },
    );

    await this.eventBus.publish(emailEvent);
  }

  private async scheduleOnboardingEmails(
    payload: any,
    correlationId: string,
    causationId: string,
  ): Promise<void> {
    const onboardingEmails = [
      {
        delay: 1 * 24 * 60 * 60 * 1000, // 1 day
        template: 'onboarding-day-1',
        subject: 'Get Started with Your First Course',
      },
      {
        delay: 3 * 24 * 60 * 60 * 1000, // 3 days
        template: 'onboarding-day-3',
        subject: 'Explore Our Course Catalog',
      },
      {
        delay: 7 * 24 * 60 * 60 * 1000, // 7 days
        template: 'onboarding-week-1',
        subject: 'Join Our Learning Community',
      },
    ];

    for (const email of onboardingEmails) {
      const scheduledAt = new Date(Date.now() + email.delay);
      
      const emailEvent = new EmailSendRequestedEvent(
        {
          emailId: uuidv4(),
          to: payload.email,
          subject: email.subject,
          templateName: email.template,
          templateData: {
            name: payload.name,
            firstName: payload.profileData?.firstName || payload.name,
            coursesUrl: `${process.env.FRONTEND_URL}/courses`,
            communityUrl: `${process.env.FRONTEND_URL}/community`,
            profileUrl: `${process.env.FRONTEND_URL}/profile`,
          },
          priority: 'normal',
          scheduledAt,
          metadata: {
            source: 'user-onboarding',
            category: 'onboarding',
            tags: ['onboarding', 'education'],
            trackingEnabled: true,
            userId: payload.userId,
            onboardingStep: email.template,
          },
        },
        {
          correlationId,
          causationId,
          userId: payload.userId,
        },
      );

      await this.eventBus.publish(emailEvent);
    }
  }

  private async trackRegistrationAnalytics(
    payload: any,
    correlationId: string,
  ): Promise<void> {
    // This would integrate with your analytics system
    this.logger.debug('Tracking registration analytics', {
      userId: payload.userId,
      registrationMethod: payload.registrationMethod,
      registrationSource: payload.registrationSource,
      referralCode: payload.referralCode,
      correlationId,
    });
  }

  private generateVerificationToken(): string {
    return uuidv4().replace(/-/g, '');
  }
}
