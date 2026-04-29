import { Controller, Get, Param, Query, Header } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { EntityNotFoundException } from '../shared/domain/exceptions/domain-exceptions';

import { ListUsersUseCase, ListUsersRequest } from './application/use-cases/list-users.use-case';
import { GetUserUseCase, GetUserRequest } from './application/use-cases/get-user.use-case';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
  ) {}

  @Get()
  @Header('X-Next-Cursor', '')
  @ApiOperation({
    summary: 'List users',
    description: 'Returns a paginated list of users. Supports cursor-based pagination and optional search filtering.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Filter users by name or email', example: 'alice' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Pagination cursor from the previous response', example: 'eyJpZCI6IjEyMyJ9' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results per page (default: 20)', example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
    headers: {
      'X-Next-Cursor': {
        description: 'Cursor for the next page of results (empty if no more pages)',
        schema: { type: 'string' },
      },
    },
    content: {
      'application/json': {
        example: {
          data: [
            {
              id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
              email: 'alice@example.com',
              firstName: 'Alice',
              lastName: 'Smith',
              isActive: true,
              createdAt: '2024-01-15T10:30:00.000Z',
            },
            {
              id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
              email: 'bob@example.com',
              firstName: 'Bob',
              lastName: 'Jones',
              isActive: true,
              createdAt: '2024-01-16T09:00:00.000Z',
            },
          ],
          nextCursor: 'eyJpZCI6ImIyYzNkNGU1In0=',
          total: 2,
        },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Returns a single user by their UUID.',
  })
  @ApiParam({ name: 'id', description: 'User UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    content: {
      'application/json': {
        example: {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          email: 'alice@example.com',
          firstName: 'Alice',
          lastName: 'Smith',
          isActive: true,
          createdAt: '2024-01-15T10:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    content: {
      'application/json': {
        example: {
          statusCode: 404,
          message: 'User with id a1b2c3d4-e5f6-7890-abcd-ef1234567890 not found',
          error: 'Not Found',
        },
      },
    },
  })
  async findOne(@Param('id') id: string) {
    const user = await this.getUserUseCase.execute(new GetUserRequest(id));
    if (!user) {
      throw new EntityNotFoundException('User', id);
    }
    return user;
  }
}
