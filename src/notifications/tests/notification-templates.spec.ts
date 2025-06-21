import { NotificationTemplates } from '../templates/notification-templates';
import { NotificationType } from '../entities/notification.entity';
import { expect } from '@jest/globals';

describe('NotificationTemplates', () => {
  describe('getTemplate', () => {
    it('should return course update template', () => {
      const data = { courseName: 'Blockchain Basics', courseId: 'course-123' };
      const template = NotificationTemplates.getTemplate(NotificationType.COURSE_UPDATE, data);

      expect(template.title).toBe('Course Update');
      expect(template.body).toContain('Blockchain Basics');
      expect(template.clickAction).toBe('/courses/course-123');
      expect(template.data).toEqual({ courseId: 'course-123', type: 'course_update' });
    });

    it('should return assignment due template', () => {
      const data = { assignmentName: 'Quiz 1', assignmentId: 'assignment-123', dueDate: 'tomorrow' };
      const template = NotificationTemplates.getTemplate(NotificationType.ASSIGNMENT_DUE, data);

      expect(template.title).toBe('Assignment Due Soon');
      expect(template.body).toContain('Quiz 1');
      expect(template.body).toContain('tomorrow');
      expect(template.clickAction).toBe('/assignments/assignment-123');
    });

    it('should return achievement template', () => {
      const data = { 
        achievementName: 'First Course Complete', 
        achievementId: 'ach-123',
        achievementImage: '/images/achievement.png'
      };
      const template = NotificationTemplates.getTemplate(NotificationType.ACHIEVEMENT_UNLOCKED, data);

      expect(template.title).toBe('Achievement Unlocked! 🎉');
      expect(template.body).toContain('First Course Complete');
      expect(template.imageUrl).toBe('/images/achievement.png');
    });

    it('should throw error for unknown template type', () => {
      expect(() => {
        NotificationTemplates.getTemplate('unknown' as NotificationType, {});
      }).toThrow('Template not found for notification type: unknown');
    });
  });

  describe('getAvailableTypes', () => {
    it('should return all notification types', () => {
      const types = NotificationTemplates.getAvailableTypes();
      
      expect(types).toContain(NotificationType.COURSE_UPDATE);
      expect(types).toContain(NotificationType.ASSIGNMENT_DUE);
      expect(types).toContain(NotificationType.ACHIEVEMENT_UNLOCKED);
      expect(types).toContain(NotificationType.ANNOUNCEMENT);
      expect(types).toContain(NotificationType.REMINDER);
      expect(types).toContain(NotificationType.MARKETING);
      expect(types).toContain(NotificationType.SYSTEM);
    });
  });
});

