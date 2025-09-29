import { v4 as uuidv4 } from 'uuid';

export interface CommandMetadata {
  commandId: string;
  correlationId?: string;
  causationId?: string;
  userId?: string;
  timestamp: Date;
  source?: string;
  [key: string]: any;
}

export abstract class Command {
  public readonly commandId: string;
  public readonly commandType: string;
  public readonly timestamp: Date;
  public readonly metadata: CommandMetadata;

  constructor(metadata: Partial<CommandMetadata> = {}) {
    this.commandId = uuidv4();
    this.commandType = this.constructor.name;
    this.timestamp = new Date();
    this.metadata = {
      ...metadata,
      commandId: this.commandId,
      timestamp: this.timestamp,
    };
  }

  abstract validate(): void;

  toJSON(): any {
    return {
      commandId: this.commandId,
      commandType: this.commandType,
      timestamp: this.timestamp,
      metadata: this.metadata,
      payload: this.getPayload(),
    };
  }

  abstract getPayload(): any;
}

export interface CommandResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  events?: any[];
  metadata?: any;
}

export abstract class CommandHandler<TCommand extends Command = Command, TResult = any> {
  abstract handle(command: TCommand): Promise<CommandResult<TResult>>;

  protected createSuccessResult<T>(data?: T, events?: any[], metadata?: any): CommandResult<T> {
    return {
      success: true,
      data,
      events,
      metadata,
    };
  }

  protected createErrorResult(error: string, metadata?: any): CommandResult {
    return {
      success: false,
      error,
      metadata,
    };
  }
}
