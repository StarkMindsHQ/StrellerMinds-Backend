import { Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ICommand, ICommandHandler, ICommandResult } from '../interfaces/command.interface';
import { COMMAND_HANDLER_METADATA } from '../decorators/command-handler.decorator';

@Injectable()
export class CommandBus {
  private handlers = new Map<string, ICommandHandler>();

  constructor(private readonly moduleRef: ModuleRef) {}

  register(commandType: string, handler: ICommandHandler) {
    this.handlers.set(commandType, handler);
  }

  async execute<TCommand extends ICommand>(command: TCommand): Promise<ICommandResult> {
    const commandType = command.constructor.name;
    const handler = this.handlers.get(commandType);

    if (!handler) {
      throw new NotFoundException(`Command handler not found for ${commandType}`);
    }

    try {
      const result = await handler.handle(command);
      return {
        success: true,
        data: result,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  async registerHandlers() {
    const providers = this.moduleRef.entries.values();
    for (const provider of providers) {
      const metadata = Reflect.getMetadata(COMMAND_HANDLER_METADATA, provider.constructor);
      if (metadata) {
        this.register(metadata.name, provider as ICommandHandler);
      }
    }
  }
}
