import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '../../cqrs';
import { CreateUserCommand } from '../commands/create-user.command';
import { GetUserByIdQuery } from '../queries/get-user-by-id.query';

@Controller('cqrs-users')
export class CqrsUserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: any) {
    const command = new CreateUserCommand(createUserDto);
    const result = await this.commandBus.execute(command);

    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      success: true,
      data: result.data,
      message: 'User created successfully using CQRS pattern',
    };
  }

  @Get(':userId')
  async getUserById(
    @Param('userId') userId: string,
    @Body() options?: { includeProfile?: boolean; includeActivity?: boolean }
  ) {
    const query = new GetUserByIdQuery({
      userId,
      includeProfile: options?.includeProfile,
      includeActivity: options?.includeActivity,
    });

    const result = await this.queryBus.execute(query);

    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      success: true,
      data: result.data,
      message: 'User retrieved successfully using CQRS pattern',
    };
  }
}
