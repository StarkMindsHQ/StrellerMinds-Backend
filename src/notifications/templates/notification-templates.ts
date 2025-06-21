import { NotificationType } from '../entities/notification.entity';

export interface NotificationTemplate {
  title: string;
  body: string;
  imageUrl?: string;
  clickAction?: string;
  data?: Record<string, any>;
}

export class NotificationTemplates {
  private static templates: Record<NotificationType, (data: any) => NotificationTemplate> = {
    [NotificationType.COURSE_UPDATE]: (data) => ({
      title: 'Course Update',
      body: `New content available in ${data.courseName}`,
      clickAction: `/courses/${data.courseId}`,
      data: { courseId: data.courseId, type: 'course_update' }
    }),

    [NotificationType.ASSIGNMENT_DUE]: (data) => ({
      title: 'Assignment Due Soon',
      body: `${data.assignmentName} is due ${data.dueDate}`,
      clickAction: `/assignments/${data.assignmentId}`,
      data: { assignmentId: data.assignmentId, type: 'assignment_due' }
    }),

    [NotificationType.ACHIEVEMENT_UNLOCKED]: (data) => ({
      title: 'Achievement Unlocked! 🎉',
      body: `You've earned the ${data.achievementName} achievement!`,
      imageUrl: data.achievementImage,
      clickAction: '/achievements',
      data: { achievementId: data.achievementId, type: 'achievement' }
    }),

    [NotificationType.ANNOUNCEMENT]: (data) => ({
      title: data.title || 'New Announcement',
      body: data.message,
      clickAction: '/announcements',
      data: { announcementId: data.id, type: 'announcement' }
    }),

    [NotificationType.REMINDER]: (data) => ({
      title: 'Reminder',
      body: data.message,
      clickAction: data.clickAction,
      data: { type: 'reminder', ...data.extraData }
    }),

    [NotificationType.MARKETING]: (data) => ({
      title: data.title,
      body: data.message,
      imageUrl: data.imageUrl,
      clickAction: data.clickAction,
      data: { type: 'marketing', campaignId: data.campaignId }
    }),

    [NotificationType.SYSTEM]: (data) => ({
      title: 'System Notification',
      body: data.message,
      clickAction: data.clickAction,
      data: { type: 'system', ...data.extraData }
    })
  };

  static getTemplate(type: NotificationType, data: any): NotificationTemplate {
    const templateFn = this.templates[type];
    if (!templateFn) {
      throw new Error(`Template not found for notification type: ${type}`);
    }
    return templateFn(data);
  }

  static getAvailableTypes(): NotificationType[] {
    return Object.keys(this.templates) as NotificationType[];
  }
}
