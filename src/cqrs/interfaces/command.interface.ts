export interface ICommand<T = any> {
  readonly data: T;
  readonly timestamp: Date;
  readonly id: string;
  readonly userId?: string;
}

export interface ICommandHandler<TCommand extends ICommand> {
  handle(command: TCommand): Promise<any>;
}

export interface ICommandResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}
