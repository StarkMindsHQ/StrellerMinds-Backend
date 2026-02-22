import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailQueue } from '../entities/email-queue.entity';
import { EmailTemplate } from '../entities/email-template.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { EmailNotificationsService } from './email-notifications.service';
import { SendEmailDto } from '../dto/send-email.dto';

@Injectable()
export class DigestEmailService {
  private readonly logger = new Logger(DigestEmailService.name);
  constructor(
    @InjectRepository(NotificationPreference)
    private notificationPreferenceRepository: Repository<NotificationPreference>,
    private emailNotificationsService: EmailNotificationsService,
  ) {}

  async generateCourseUpdatesDigest(userId: string, period: 'daily' | 'weekly'): Promise<any> {
    // In a real implementation, this would fetch recent course updates for the user
    // For now, we'll return sample data

    const updates = [
      {
        courseName: 'Introduction to Blockchain',
        title: 'New lecture added: Smart Contracts Basics',
        date: new Date(),
        url: `/courses/blockchain/lectures/smart-contracts-basics`,
      },
      {
        courseName: 'Web Development Fundamentals',
        title: 'Assignment deadline extended to next week',
        date: new Date(),
        url: `/courses/web-dev/assignments/assignment-3`,
      },
    ];

    if (updates.length === 0) {
      return null; // No updates to send
    }

    return {
      title: `Course Updates for ${period === 'daily' ? 'Today' : 'This Week'}`,
      updates,
      summary: `You have ${updates.length} new course updates`,
    };
  }

  async generateDeadlinesDigest(userId: string, period: 'daily' | 'weekly'): Promise<any> {
    // In a real implementation, this would fetch upcoming deadlines for the user
    // For now, we'll return sample data

    const deadlines = [
      {
        courseName: 'Blockchain Project',
        assignment: 'Final Project Submission',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        url: `/courses/blockchain/projects/final-project`,
      },
      {
        courseName: 'Web Development',
        assignment: 'Midterm Exam',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        url: `/courses/web-dev/exams/midterm`,
      },
    ];

    if (deadlines.length === 0) {
      return null; // No deadlines to send
    }

    return {
      title: `Upcoming Deadlines for ${period === 'daily' ? 'Next Few Days' : 'Next Week'}`,
      deadlines,
      summary: `You have ${deadlines.length} upcoming deadlines`,
    };
  }

  async generateAnnouncementsDigest(userId: string, period: 'daily' | 'weekly'): Promise<any> {
    // In a real implementation, this would fetch recent announcements for the user
    // For now, we'll return sample data

    const announcements = [
      {
        title: 'Platform Maintenance Scheduled',
        content: 'Scheduled maintenance on Saturday from 2 AM to 4 AM UTC',
        date: new Date(),
        priority: 'high',
      },
      {
        title: 'New Course Added: Advanced JavaScript',
        content: 'Check out our newly launched advanced JavaScript course',
        date: new Date(),
        priority: 'medium',
      },
    ];

    if (announcements.length === 0) {
      return null; // No announcements to send
    }

    return {
      title: `Platform Announcements for ${period === 'daily' ? 'Today' : 'This Week'}`,
      announcements,
      summary: `You have ${announcements.length} new announcements`,
    };
  }

  async sendDigestEmail(userId: string, period: 'daily' | 'weekly' = 'daily'): Promise<boolean> {
    try {
      // Check if user wants digest emails
      const preferences = await this.notificationPreferenceRepository.findOne({
        where: { userId },
      });

      if (!preferences || !preferences.emailEnabled) {
        return false; // User has disabled emails
      }

      const digestConfig = preferences.preferences['DIGEST'];
      if (!digestConfig?.enabled) {
        return false; // User has disabled digest emails
      }

      // Check frequency preference
      if (digestConfig.frequency === 'never') {
        return false;
      }

      if (period === 'daily' && digestConfig.frequency === 'weekly') {
        return false; // User wants weekly digests only
      }

      // Generate digest content
      const courseUpdates = await this.generateCourseUpdatesDigest(userId, period);
      const deadlines = await this.generateDeadlinesDigest(userId, period);
      const announcements = await this.generateAnnouncementsDigest(userId, period);

      // Only send if there's content
      if (!courseUpdates && !deadlines && !announcements) {
        return true; // Nothing to send, but operation was successful
      }

      // Build the digest email content
      let htmlContent = `
        <h1>Your ${period === 'daily' ? 'Daily' : 'Weekly'} Digest</h1>
      `;

      if (courseUpdates) {
        htmlContent += `
          <h2>${courseUpdates.title}</h2>
          <ul>
        `;
        courseUpdates.updates.forEach((update) => {
          htmlContent += `
            <li>
              <strong>${update.courseName}:</strong> 
              <a href="${update.url}">${update.title}</a>
              <small>(${new Date(update.date).toLocaleDateString()})</small>
            </li>
          `;
        });
        htmlContent += '</ul>';
      }

      if (deadlines) {
        htmlContent += `
          <h2>${deadlines.title}</h2>
          <ul>
        `;
        deadlines.deadlines.forEach((deadline) => {
          htmlContent += `
            <li>
              <strong>${deadline.courseName}:</strong> 
              <a href="${deadline.url}">${deadline.assignment}</a> 
              <em>Due: ${new Date(deadline.dueDate).toLocaleDateString()}</em>
            </li>
          `;
        });
        htmlContent += '</ul>';
      }

      if (announcements) {
        htmlContent += `
          <h2>${announcements.title}</h2>
          <ul>
        `;
        announcements.announcements.forEach((announcement) => {
          htmlContent += `
            <li>
              <strong>${announcement.title}</strong> 
              <p>${announcement.content}</p>
              <small>Posted: ${new Date(announcement.date).toLocaleDateString()}</small>
            </li>
          `;
        });
        htmlContent += '</ul>';
      }

      htmlContent +=
        '<hr><p>Manage your email preferences <a href="/settings/notifications">here</a>.</p>';

      // Send the digest email
      const sendEmailDto: SendEmailDto = {
        to: '', // Will be populated from user data
        subject: `StrellerMinds ${period === 'daily' ? 'Daily' : 'Weekly'} Digest`,
        htmlContent,
        templateData: {
          period,
          courseUpdates,
          deadlines,
          announcements,
        },
      };

      // In a real implementation, we'd get the user's email from the user entity
      // For now, we'll just return true to indicate success
      return true;
    } catch (error) {
      this.logger.error('Error sending digest email:', error);
      return false;
    }
  }

  async scheduleDigestEmails(): Promise<void> {
    // This method would typically be called by a cron job or scheduled task
    // It would iterate through all users who have digest emails enabled
    // and send them their appropriate digest based on their preferences

    // For now, we'll just log that the function exists
    this.logger.log('Scheduling digest emails...');
  }

  async sendBulkDigestEmails(period: 'daily' | 'weekly'): Promise<number> {
    // Get all users who have digest emails enabled
    const usersWithDigestEnabled = await this.notificationPreferenceRepository
      .createQueryBuilder('preferences')
      .where('preferences."emailEnabled" = :enabled', { enabled: true })
      .andWhere("preferences.preferences->'DIGEST'->>'enabled' = :digestEnabled", {
        digestEnabled: 'true',
      })
      .select('preferences.userId')
      .getRawMany();

    let sentCount = 0;

    for (const userData of usersWithDigestEnabled) {
      try {
        const success = await this.sendDigestEmail(userData.userId, period);
        if (success) {
          sentCount++;
        }
      } catch (error) {
        this.logger.error(`Error sending digest to user ${userData.userId}:`, error);
      }
    }

    return sentCount;
  }
}
