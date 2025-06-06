import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  ParseUUIDPipe,
  ConflictException,
  InternalServerErrorException,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';

import { CreateUsersDto } from './dtos/create.users.dto';
import { updateUsersDto } from './dtos/update.users.dto';
import { UsersService } from './services/users.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { RateLimitGuard } from 'src/common/guards/rate-limiter.guard';
import { CacheInterceptor } from '../cache/interceptors/cache.interceptor';
import { CacheInvalidationInterceptor } from '../cache/interceptors/cache-invalidation.interceptor';
import {
  Cacheable,
  CacheUserData,
  CacheForMinutes,
  CacheForHours,
} from '../cache/decorators/cacheable.decorator';
import {
  CacheKey,
  CacheKeyWithQuery,
  CustomCacheKey,
} from '../cache/decorators/cache-key.decorator';
import { CacheTTL } from '../cache/decorators/cache-ttl.decorator';


@Controller('users')
@UseInterceptors(CacheInterceptor, CacheInvalidationInterceptor)
export class UsersController {
  constructor(private readonly userService: UsersService) {} 

  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(RateLimitGuard)
  @Post('create')
  async createUser(
    @UploadedFile() file: Express.Multer.File,
    @Body() createUsersDto: CreateUsersDto,
  ) {
    try {
      const user = await this.userService.create(createUsersDto, file);
      return user;
    } catch (error) {
      throw new InternalServerErrorException('Error creating user');
    }
  }

  @Get()
  public async findAll() {
    return await this.userService.findAll();
  }

  @Get(':id')
  public async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.userService.findOne(id);
  }

  @Patch(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: updateUsersDto,
  ) {
    return await this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  public async delete(@Param('id', ParseUUIDPipe) id: string) {
    return await this.userService.delete(id);
  }

  @Post(':id/request-account-deletion')
  async requestAccountDeletion(@Param('id') id: string) {
    await this.userService.requestAccountDeletion(id);
    return { message: 'Account deletion confirmation email sent' };
  }

    @Get()
  @CacheUserData()
  @CacheKeyWithQuery()
  async findAll(@Query() query: any) {
    return this.usersService.findAll(query);
  }

  @Get('public')
  @CacheForHours(2)
  @CacheKey({ prefix: 'public-users' })
  async findPublicUsers() {
    return this.usersService.findPublicUsers();
  }

  @Get(':id')
  @Cacheable({
    ttl: 600, 
    keyPrefix: 'user',
    invalidateOn: ['user:update', 'user:delete'],
  })
  @CustomCacheKey((context) => {
    const request = context.switchToHttp().getRequest();
    return `user:${request.params.id}:profile`;
  })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get(':id/stats')
  @CacheForMinutes(30)
  @CacheKey({ prefix: 'user-stats' })
  async getUserStats(@Param('id') id: string) {
    return this.usersService.getUserStats(id);
  }

  @Post()
  async create(@Body() createUserDto: any) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

}
