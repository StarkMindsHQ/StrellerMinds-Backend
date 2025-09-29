import { Injectable } from "@nestjs/common"
import type { EventEmitter2 } from "@nestjs/event-emitter"

/**
 * Service for emitting application events using EventEmitter2.
 */
@Injectable()
export class EventEmitterService {
  constructor(private eventEmitter: EventEmitter2) {}

  /**
   * Emit an event with a payload.
   * @param event Event name
   * @param payload Event payload
   * @returns True if event listeners were notified
   */
  emit(event: string, payload: any): boolean {
    return this.eventEmitter.emit(event, payload)
  }
}
