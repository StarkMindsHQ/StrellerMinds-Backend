import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UserService } from './user.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  ChangePasswordDto,
  UserQueryDto,
  BulkUpdateDto,
  UserResponseDto,
} from './dto/user.dto';
import { RequestWithUser } from '../common/types/request.types';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @Request() req?: RequestWithUser,
  ): Promise<UserResponseDto> {
    return this.userService.create(createUserDto, req?.user?.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  async findAll(@Query() query: UserQueryDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req?: RequestWithUser,
  ): Promise<UserResponseDto> {
    return this.userService.update(id, updateUserDto, req?.user?.sub);
  }

  @Patch(':id/profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.userService.updateProfile(id, updateProfileDto);
  }

  @Post(':id/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.userService.changePassword(id, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  @Post(':id/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `avatar-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserResponseDto> {
    return this.userService.uploadAvatar(id, file.path);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a user account' })
  @ApiResponse({
    status: 200,
    description: 'User suspended successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async suspend(
    @Param('id') id: string,
    @Request() req?: RequestWithUser,
  ): Promise<UserResponseDto> {
    return this.userService.suspend(id, req?.user?.sub);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a suspended user account' })
  @ApiResponse({
    status: 200,
    description: 'User reactivated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async reactivate(
    @Param('id') id: string,
    @Request() req?: RequestWithUser,
  ): Promise<UserResponseDto> {
    return this.userService.reactivate(id, req?.user?.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a user' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(
    @Param('id') id: string,
    @Request() req?: RequestWithUser,
  ): Promise<void> {
    return this.userService.remove(id, req?.user?.sub);
  }

  @Post('bulk-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk update multiple users' })
  @ApiResponse({
    status: 200,
    description: 'Bulk update completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'number' },
        failed: { type: 'number' },
      },
    },
  })
  async bulkUpdate(
    @Body() bulkUpdateDto: BulkUpdateDto,
    @Request() req?: RequestWithUser,
  ): Promise<{ success: number; failed: number }> {
    return this.userService.bulkUpdate(bulkUpdateDto, req?.user?.sub);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export user data (GDPR compliance)' })
  @ApiResponse({
    status: 200,
    description: 'User data exported successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async exportData(@Param('id') id: string) {
    return this.userService.exportUserData(id);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get user activity history' })
  @ApiResponse({
    status: 200,
    description: 'Activities retrieved successfully',
  })
  async getActivities(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.userService.getUserActivities(id, limit);
  }
}
