import { Injectable, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Notification,
  NotificationStatus,
  NotificationType,
} from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import type { CreateNotificationDto } from './dto/create-notification.dto';
import type { CreateNotificationFromTemplateDto } from './dto/create-notification-from-template.dto';
import type { UpdateNotificationDto } from './dto/update-notification.dto';
import type { NotificationPreferenceDto } from './dto/notification-preference.dto';
import type { QueryNotificationsDto } from './dto/query-notifications.dto';
import { UsersService } from 'src/users/services/users.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { InAppService } from './providers/in-app.service';
import { PreferenceService } from './providers/preferences.service';
import { EmailService } from './providers/email.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,

    @InjectRepository(NotificationTemplate)
    private templatesRepository: Repository<NotificationTemplate>,

    @InjectRepository(NotificationPreference)
    private preferencesRepository: Repository<NotificationPreference>,

    private usersService: UsersService,

    @Inject(forwardRef(() => NotificationDeliveryService))
    private deliveryService: NotificationDeliveryService,

    @Inject(forwardRef(() => EventEmitter2))
    private eventEmitter: EventEmitter2,

    private readonly inAppService: InAppService,

    private readonly emailService: EmailService,

    private readonly prefService: PreferenceService,
  ) {}

  async createNotification(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const user = await this.usersService.findOne(createNotificationDto.userId);
    if (!user) {
      throw new NotFoundException(
        `User with ID ${createNotificationDto.userId} not found`,
      );
    }

    const preferences = await this.getOrCreatePreference(
      user.id,
      createNotificationDto.category,
    );

    const allowedTypes = createNotificationDto.types.filter(
      (type) => preferences.enabled && preferences.enabledTypes.includes(type),
    );

    if (allowedTypes.length === 0) {
      const notification = this.notificationsRepository.create({
        ...createNotificationDto,
        types: createNotificationDto.types,
        isDelivered: false,
      });
      return this.notificationsRepository.save(notification);
    }

    const notification = this.notificationsRepository.create({
      ...createNotificationDto,
      types: allowedTypes,
    });

    const savedNotification =
      await this.notificationsRepository.save(notification);

    if (createNotificationDto.sendImmediately !== false) {
      await this.deliveryService.deliverNotification(savedNotification);

      savedNotification.isDelivered = true;
      savedNotification.deliveredAt = new Date();
      await this.notificationsRepository.save(savedNotification);

      this.eventEmitter.emit('notification.created', savedNotification);
    }

    return savedNotification;
  }

  async createFromTemplate(
    dto: CreateNotificationFromTemplateDto,
  ): Promise<Notification> {
    const template = await this.templatesRepository.findOne({
      where: { code: dto.templateCode, isActive: true },
    });

    if (!template) {
      throw new NotFoundException(
        `Template with code ${dto.templateCode} not found or inactive`,
      );
    }

    const title = this.processTemplate(
      template.titleTemplate,
      dto.templateVariables,
    );
    const content = this.processTemplate(
      template.contentTemplate,
      dto.templateVariables,
    );

    const createDto: CreateNotificationDto = {
      userId: dto.userId,
      title,
      content,
      types: dto.types || template.supportedTypes,
      category: template.category,
      priority: dto.priority || template.defaultMetadata?.priority,
      metadata: { ...template.defaultMetadata, ...dto.metadata },
      sendImmediately: dto.sendImmediately,
    };

    return this.createNotification(createDto);
  }

  async findAllForUser(userId: string, query: QueryNotificationsDto) {
    const { status, category, page = 1, limit = 20 } = query;

    const queryBuilder = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('notification.status = :status', { status });
    }

    if (category) {
      queryBuilder.andWhere('notification.category = :category', { category });
    }

    const [notifications, total] = await queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationsRepository.count({
      where: {
        userId,
        status: NotificationStatus.UNREAD,
      },
    });

    return { count };
  }

  async findOne(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async update(
    id: string,
    updateNotificationDto: UpdateNotificationDto,
    userId: string,
  ): Promise<Notification> {
    const notification = await this.findOne(id, userId);

    if (
      updateNotificationDto.status === NotificationStatus.READ &&
      notification.status === NotificationStatus.UNREAD
    ) {
      notification.readAt = new Date();
    }

    Object.assign(notification, updateNotificationDto);
    return this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<{ affected: number }> {
    const result = await this.notificationsRepository.update(
      {
        userId,
        status: NotificationStatus.UNREAD,
      },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    );

    return { affected: result.affected || 0 };
  }

  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.findOne(id, userId);
    await this.notificationsRepository.remove(notification);
  }

  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.preferencesRepository.find({
      where: { userId },
    });
  }

  async updatePreferences(
    userId: string,
    preferences: NotificationPreferenceDto[],
  ): Promise<NotificationPreference[]> {
    await this.usersService.findOne(userId);

    const results: NotificationPreference[] = [];

    for (const pref of preferences) {
      const existing = await this.preferencesRepository.findOne({
        where: { userId, category: pref.category },
      });

      if (existing) {
        Object.assign(existing, pref);
        results.push(await this.preferencesRepository.save(existing));
      } else {
        const newPref = this.preferencesRepository.create({
          userId,
          ...pref,
        });
        results.push(await this.preferencesRepository.save(newPref));
      }
    }

    return results;
  }

  private async getOrCreatePreference(
    userId: string,
    category: string,
  ): Promise<NotificationPreference> {
    let preference = await this.preferencesRepository.findOne({
      where: { userId, category },
    });

    if (!preference) {
      preference = this.preferencesRepository.create({
        userId,
        category,
        enabled: true,
        enabledTypes: Object.values(NotificationType),
      });

      await this.preferencesRepository.save(preference);
    }

    return preference;
  }

  private processTemplate(
    template: string,
    variables: Record<string, any>,
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  async getUserEmail(userId: string): Promise<string> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user.email;
  }

  async sendNotification(
    userId: string,
    type: string,
    payload: { title: string; message: string },
  ) {
    const prefs = await this.prefService.getOrCreate(userId);

    if (prefs.preferences.email) {
      const email = await this.getUserEmail(userId);
      await this.emailService.sendEmail({
        to: email,
        subject: payload.title,
        text: payload.message,
        html: `<p>${payload.message}</p>`,
        metadata: { headers: { 'X-Notification-Type': type } },
      });
    }

    if (prefs.preferences.inApp) {
      await this.inAppService.sendInAppNotification(userId, {
        title: payload.title,
        content: payload.message,
        category: 'general',
        metadata: {},
      });
    }
  }

  public async getUserByUsername(username: string) {
    return this.usersService.findByUsername(username);
  }
}
