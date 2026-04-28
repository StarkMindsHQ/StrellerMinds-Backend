import { Controller, Get, Param, Query, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { UserService } from './user.service';
import { EntityNotFoundException } from '../shared/domain/exceptions/domain-exceptions';
import { StreamResponse } from '../common/decorators/stream-response.decorator';
import { StreamUtil } from '../common/utils/stream.util';

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
  @StreamResponse({ contentType: 'application/json' })
  async findAll(
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
    @Query('stream') stream?: boolean,
    @Res() res?: Response,
  ) {
    const defaultLimit = 20;
    const requestedLimit = limit ? parseInt(limit.toString(), 10) : defaultLimit;
    
    const result = await this.listUsersUseCase.execute(new ListUsersRequest(search, cursor, requestedLimit));

    // Use streaming if requested and response object is available
    if (stream && res) {
      res.setHeader('X-Next-Cursor', result.nextCursor || '');
      res.setHeader('X-Has-More', result.hasMore.toString());
      
      const jsonStream = StreamUtil.jsonArrayToStream(result.users, 50);
      jsonStream.pipe(res);
      return;
    }

    // Default behavior for non-streaming requests
    return result;
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
