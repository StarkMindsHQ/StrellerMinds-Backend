import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notification.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post()
  async create(@Body() dto: CreateNotificationDto): Promise<Notification> {
    return this.notificationsService.create(dto);
  }

  @Get()
  async findAll(): Promise<Notification[]> {
    return this.notificationsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Notification> {
    return this.notificationsService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateNotificationDto>,
  ): Promise<Notification> {
    return this.notificationsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.notificationsService.remove(id);
  }
}
