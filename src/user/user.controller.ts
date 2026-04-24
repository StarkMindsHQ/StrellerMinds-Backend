import { Controller, Get, Param, Query, Header } from '@nestjs/common';
import { UserService } from './user.service';
import { EntityNotFoundException } from '../shared/domain/exceptions/domain-exceptions';

import { ListUsersUseCase, ListUsersRequest } from './application/use-cases/list-users.use-case';
import { GetUserUseCase, GetUserRequest } from './application/use-cases/get-user.use-case';

@Controller('users')
export class UserController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
  ) {}

  @Get()
  @Header('X-Next-Cursor', '')
  async findAll(
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    const defaultLimit = 20;
    const requestedLimit = limit ? parseInt(limit.toString(), 10) : defaultLimit;
    return this.listUsersUseCase.execute(new ListUsersRequest(search, cursor, requestedLimit));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.getUserUseCase.execute(new GetUserRequest(id));
    if (!user) {
      throw new EntityNotFoundException('User', id);
    }
    return user;
  }
}
