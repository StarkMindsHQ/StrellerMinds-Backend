import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { UserProfilesService } from './user-profiles.service';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { detectLanguageFromHeader } from 'src/common/util/language-detector.util';

@ApiTags('user-profiles')
@Controller('user-profiles')
export class UserProfilesController {
  constructor(private readonly userProfilesService: UserProfilesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new user profile' })
  @ApiResponse({
    status: 201,
    description: 'The profile has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Request() req, @Body() createUserProfileDto: CreateUserProfileDto) {
    return this.userProfilesService.create(req.user.id, createUserProfileDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all public profiles' })
  @ApiResponse({ status: 200, description: 'Return all public profiles.' })
  findAll() {
    return this.userProfilesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a profile by id' })
  @ApiResponse({ status: 200, description: 'Return the profile.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.userProfilesService.findOne(id);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a profile by user id' })
  @ApiResponse({ status: 200, description: 'Return the profile.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  findByUserId(@Param('userId') userId: string, @Request() req) {
    return this.userProfilesService.findByUserId(userId, req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a profile' })
  @ApiResponse({
    status: 200,
    description: 'The profile has been successfully updated.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ) {
    return this.userProfilesService.update(id, req.user.id, updateUserProfileDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Partially update a profile' })
  @ApiResponse({
    status: 200,
    description: 'The profile has been successfully updated.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  patch(
    @Param('id') id: string,
    @Request() req,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ) {
    return this.userProfilesService.patch(id, req.user.id, updateUserProfileDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a profile' })
  @ApiResponse({
    status: 204,
    description: 'The profile has been successfully deleted.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  remove(@Param('id') id: string, @Request() req) {
    return this.userProfilesService.remove(id, req.user.id);
  }

  @Delete(':id/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin delete a profile' })
  @ApiResponse({
    status: 204,
    description: 'The profile has been successfully deleted.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  adminRemove(@Param('id') id: string, @Request() req) {
    // Admin can delete any profile
    return this.userProfilesService.remove(id, req.user.id);
  }

  @Get('detect-language')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Detect and store preferred language' })
  @ApiResponse({ status: 200, description: 'Detected language returned and saved.' })
  @ApiBearerAuth()
  async detectLanguage(@Request() req, @Headers('accept-language') acceptLanguage: string) {
    const detectedLang = detectLanguageFromHeader(acceptLanguage) || 'en';

    // Save to user's profile
    await this.userProfilesService.setPreferredLanguage(req.user.id, detectedLang);

    return { detectedLanguage: detectedLang };
  }
}
