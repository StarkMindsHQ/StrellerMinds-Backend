import { Controller, Post, Body, Get, Param, Query, Put, Delete } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { BookOfficeHourDto } from './dto/book-office-hour.dto';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly svc: CalendarService) {}

  @Post('events')
  async createEvent(@Body() dto: CreateEventDto) {
    return this.svc.createEvent(dto);
  }

  @Get('events')
  async list(@Query() query: any) {
    return this.svc.findAll(query);
  }

  @Get('events/:id')
  async get(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @Put('events/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.svc.updateEvent(id, dto);
  }

  @Delete('events/:id')
  async remove(@Param('id') id: string) {
    return this.svc.removeEvent(id);
  }

  @Post('events/:id/book')
  async book(@Param('id') id: string, @Body() dto: BookOfficeHourDto) {
    return this.svc.bookOfficeHour(id, dto);
  }

  @Get('events/:id/ical')
  async ical(@Param('id') id: string) {
    const ev = await this.svc.getById(id);
    const ics = await this.svc.getEventICalString(ev);
    return { ics };
  }
}
