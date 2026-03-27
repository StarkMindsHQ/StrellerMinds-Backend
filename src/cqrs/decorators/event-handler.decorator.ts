import { SetMetadata } from '@nestjs/common';

export const EVENT_HANDLER_METADATA = 'event_handler';

export const EventHandler = (eventType: any) => 
  SetMetadata(EVENT_HANDLER_METADATA, eventType);
