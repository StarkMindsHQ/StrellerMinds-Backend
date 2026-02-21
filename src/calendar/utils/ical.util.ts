import { Event } from '../entities/event.entity';
import ical from 'ical-generator';
import { DateTime } from 'luxon';

export function eventToICal(ev: Event) {
  const cal = ical({ name: `StrellerMinds - ${ev.title}` });

  const start = DateTime.fromJSDate(new Date(ev.start)).setZone(ev.timezone || 'UTC');
  const end = ev.end ? DateTime.fromJSDate(new Date(ev.end)).setZone(ev.timezone || 'UTC') : undefined;

  cal.createEvent({
    id: ev.id,
    start: start.toJSDate(),
    end: end ? end.toJSDate() : undefined,
    summary: ev.title,
    description: ev.description || undefined,
    timezone: ev.timezone || 'UTC',
    allDay: ev.allDay,
  });

  return cal.toString();
}
