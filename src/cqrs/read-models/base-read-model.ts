import { Injectable, Logger } from '@nestjs/common';
import { IEventHandler } from '../interfaces/event.interface';

@Injectable()
export abstract class BaseReadModel<TEvent> implements IEventHandler<TEvent> {
  protected readonly logger: Logger;

  constructor(name: string) {
    this.logger = new Logger(`${name}ReadModel`);
  }

  abstract handle(event: TEvent): Promise<void>;

  protected async updateReadModel(
    updateFunction: () => Promise<void>
  ): Promise<void> {
    try {
      await updateFunction();
    } catch (error) {
      this.logger.error(
        `Failed to update read model: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
