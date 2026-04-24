import { Controller, Get, Param, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { EntityNotFoundException } from '../shared/domain/exceptions/domain-exceptions';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.userService.findAll(search);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findOne(id);
    if (!user) {
      throw new EntityNotFoundException('User', id);
    }
    return user;
  }
}
