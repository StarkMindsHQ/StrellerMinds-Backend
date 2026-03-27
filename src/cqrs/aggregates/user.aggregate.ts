import { BaseAggregate } from './base-aggregate';
import { IEvent } from '../interfaces/event.interface';
import { UserCreatedEvent } from '../../user/events/user-created.event';

export class UserAggregate extends BaseAggregate {
  public email: string = '';
  public username: string = '';
  public firstName?: string;
  public lastName?: string;
  public role: string = 'USER';
  public status: string = 'ACTIVE';
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(id: string) {
    super(id);
  }

  public static create(data: {
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  }): UserAggregate {
    const user = new UserAggregate(data.email);
    const event = new UserCreatedEvent({
      userId: data.email,
      email: data.email,
      username: data.username,
      role: data.role || 'USER',
    });
    
    user.applyEvent(event);
    return user;
  }

  protected when(event: IEvent): void {
    switch (event.type) {
      case 'UserCreated':
        this.handleUserCreated(event as UserCreatedEvent);
        break;
      default:
        throw new Error(`Unknown event type: ${event.type}`);
    }
  }

  private handleUserCreated(event: UserCreatedEvent): void {
    this.email = event.data.email;
    this.username = event.data.username;
    this.role = event.data.role;
    this.status = 'ACTIVE';
    this.createdAt = event.timestamp;
    this.updatedAt = event.timestamp;
  }
}
