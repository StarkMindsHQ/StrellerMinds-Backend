import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { Booking } from './entities/booking.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { BookOfficeHourDto } from './dto/book-office-hour.dto';
import { DateTime } from 'luxon';
import { NotificationsService } from '../notifications/services/notifications.service';
import { NotificationType } from '../notifications/entities/notification-preference.entity';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly notifications: NotificationsService,
  ) {}

  async createEvent(dto: CreateEventDto, ownerId?: string) {
    const ev = this.eventRepo.create({
      ...dto,
      start: DateTime.fromISO(dto.start, { zone: dto.timezone || 'UTC' }).toJSDate(),
      end: dto.end ? DateTime.fromISO(dto.end, { zone: dto.timezone || 'UTC' }).toJSDate() : undefined,
      ownerId,
    });

    return this.eventRepo.save(ev);
  }

  async findAll(filter?: any) {
    const qb = this.eventRepo.createQueryBuilder('e');
    if (filter?.ownerId) qb.andWhere('e.ownerId = :ownerId', { ownerId: filter.ownerId });
    if (filter?.eventType) qb.andWhere('e.eventType = :eventType', { eventType: filter.eventType });
    return qb.getMany();
  }

  async getById(id: string) {
    const ev = await this.eventRepo.findOne({ where: { id }, relations: ['bookings'] });
    if (!ev) throw new NotFoundException('Event not found');
    return ev;
  }

  async updateEvent(id: string, dto: UpdateEventDto) {
    const ev = await this.getById(id);
    Object.assign(ev, dto);
    if ((dto as any).start) ev.start = DateTime.fromISO((dto as any).start, { zone: dto.timezone || ev.timezone }).toJSDate();
    if ((dto as any).end) ev.end = DateTime.fromISO((dto as any).end, { zone: dto.timezone || ev.timezone }).toJSDate();
    return this.eventRepo.save(ev);
  }

  async removeEvent(id: string) {
    const ev = await this.getById(id);
    return this.eventRepo.remove(ev);
  }

  async bookOfficeHour(eventId: string, dto: BookOfficeHourDto) {
    const ev = await this.getById(eventId);
    if (ev.eventType !== 'office') throw new ConflictException('Not an office hours event');

    // basic capacity=1 unless metadata.capacity provided
    const capacity = (ev.metadata && ev.metadata.capacity) || 1;
    const current = await this.bookingRepo.count({ where: { event: { id: ev.id } as any } });
    if (current >= capacity) throw new ConflictException('No slots available');

    const existing = await this.bookingRepo.findOne({ where: { event: { id: ev.id } as any, userId: dto.userId } });
    if (existing) throw new ConflictException('You already have a booking for this slot');

    const booking = this.bookingRepo.create({ event: ev, userId: dto.userId, metadata: { notes: dto.notes } });
    const saved = await this.bookingRepo.save(booking);

    // send reminder notification (immediate enqueue)
    try {
      await this.notifications.send({
        userId: dto.userId,
        type: NotificationType.CALENDAR_BOOKING,
        title: `Booked: ${ev.title}`,
        content: `You have a booking for ${ev.title} on ${DateTime.fromJSDate(ev.start).toISO()} (${ev.timezone})`,
        metadata: { eventId: ev.id },
      });
    } catch (e) {
      // swallow notification failure; booking should succeed
    }

    return saved;
  }

  async getEventICalString(ev: Event) {
    // lazy import to avoid require issues if ical not installed
    const { eventToICal } = await import('./utils/ical.util');
    return eventToICal(ev);
  }
}
