import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationsRepository.create(dto);
    return this.notificationsRepository.save(notification);
  }

  // ✅ Add this to match other files that call `createNotification(...)`
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationsRepository.create(dto);
    return this.notificationsRepository.save(notification);
  }

  async findAll(): Promise<Notification[]> {
    return this.notificationsRepository.find();
  }

  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOneBy({ id });
    if (!notification) {
      throw new NotFoundException(`Notification with id ${id} not found`);
    }
    return notification;
  }

  async update(id: string, dto: Partial<CreateNotificationDto>): Promise<Notification> {
    await this.notificationsRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.notificationsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Notification with id ${id} not found`);
    }
  }

  async notifyUser(userId: string, message: string): Promise<Notification> {
    const notification = this.no
