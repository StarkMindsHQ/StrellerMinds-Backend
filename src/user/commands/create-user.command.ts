import { ICommand } from '../../cqrs/interfaces/command.interface';

export class CreateUserCommand implements ICommand {
  readonly data: {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };

  readonly timestamp: Date;
  readonly id: string;
  readonly userId?: string;

  constructor(data: CreateUserCommand['data'], userId?: string) {
    this.data = data;
    this.timestamp = new Date();
    this.id = `create-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.userId = userId;
  }
}
