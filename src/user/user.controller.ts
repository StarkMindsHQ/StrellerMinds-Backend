import { Controller, Get, Param, Query, Header } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Header('X-Content-Type-Options', 'nosniff')
  findAll(
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    const defaultLimit = 20;
    const requestedLimit = limit ? parseInt(limit.toString(), 10) : defaultLimit;
    return this.userService.findAll(search, cursor, requestedLimit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }
}
