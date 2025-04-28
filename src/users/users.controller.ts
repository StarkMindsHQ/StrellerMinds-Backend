import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Put,
  ParseUUIDPipe,
  Request,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { CreateUsersDto } from './dtos/create.users.dto';
import { updateUsersDto } from './dtos/update.users.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Role } from '@/roles/enums/userRole.enum'; // Updated path to use the alias '@' if configured in tsconfig.json
import { Roles } from '@/role/roles.decorator';



@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard) //  Apply both authentication and role guards
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  //  Get logged-in user's profile
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  //  Create a new user
  @Post()
  public async create(@Body() createUsersDto: CreateUsersDto) {
    return await this.usersService.create(createUsersDto);
  }

  //  Get all users - Admin only
  @Get()
  @Roles(Role.Admin) // Ensure Role.Admin is properly typed and matches the expected Role type
  public async findAll() {
    return await this.usersService.findAll();
  }

  //  Get user by ID
  @Get(':id')
  public async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.usersService.findOne(id);
  }

  //  Update user by ID
  @Patch(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: updateUsersDto,
  ) {
    return await this.usersService.update(id, updateUserDto);
  }

  //  Delete user by ID - Admin only
  @Delete(':id')
  @Roles(Role.Admin)
  public async delete(@Param('id', ParseUUIDPipe) id: string) {
    return await this.usersService.delete(id);
  }

  //  Update user role - Admin only
  @Put(':id/role')
  @Roles(Role.Admin)
  public async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('role') role: Role, // role value comes from request body
  ) {
    return await this.usersService.updateRole(id, role); // Pass the actual role value
  }
  
}
