import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommandHandler } from '../../cqrs/decorators/command-handler.decorator';
import { ICommandHandler } from '../../cqrs/interfaces/command.interface';
import { CreateUserCommand } from '../commands/create-user.command';
import { User } from '../entities/user.entity';
import { EventBus } from '../../cqrs/bus/event-bus.service';
import { UserCreatedEvent } from '../events/user-created.event';
import * as bcrypt from 'bcrypt';

@Injectable()
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventBus: EventBus,
  ) {}

  async handle(command: CreateUserCommand): Promise<User> {
    const { email, username, password, firstName, lastName, role } = command.data;

    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('Email already exists');
      }
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = this.userRepository.create({
      email,
      username,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || 'USER',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedUser = await this.userRepository.save(user);

    const event = new UserCreatedEvent(
      {
        userId: savedUser.id,
        email: savedUser.email,
        username: savedUser.username,
        role: savedUser.role,
      },
      command.userId
    );

    await this.eventBus.publish(event);

    return savedUser;
  }
}
