import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { SocialService } from '../services/social.service';
import { UserProfileService } from '../services/user-profile.service';
import {
  FollowResponseDto,
  UserNetworkDto,
  SocialStatsDto,
  BlockUserDto,
  MuteUserDto,
} from '../dto/social.dto';

@ApiTags('Social Features')
@Controller('social')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(
    private readonly socialService: SocialService,
    private readonly userProfileService: UserProfileService,
  ) {}

  // Follow Endpoints

  @Post(':userId/follow')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Follow a user' })
  @ApiResponse({ status: 201, description: 'User followed' })
  async followUser(
    @Request() req,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<FollowResponseDto> {
    const followerProfile = await this.userProfileService.getProfileByUserId(
      req.user.id,
    );
    const followingProfile = await this.userProfileService.getProfileByUserId(
      userId,
    );
    return this.socialService.followUser(followerProfile.id, followingProfile.id);
  }

  @Post(':userId/unfollow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiResponse({ status: 200, description: 'User unfollowed' })
  async unfollowUser(
    @Request() req,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<void> {
    const followerProfile = await this.userProfileService.getProfileByUserId(
      req.user.id,
    );
    const followingProfile = await this.userProfileService.getProfileByUserId(
      userId,
    );
    return this.socialService.unfollowUser(followerProfile.id, followingProfile.id);
  }

  @Get('me/followers')
  @ApiOperation({ summary: 'Get my followers' })
  @ApiResponse({ status: 200, description: 'Followers retrieved' })
  async getMyFollowers(@Request() req): Promise<any[]> {
    const profile = await this.userProfileService.getProfileByUserId(req.user.id);
    return this.socialService.getFollowers(profile.id);
  }

  @Get('me/following')
  @ApiOperation({ summary: 'Get users I follow' })
  @ApiResponse({ status: 200, description: 'Following retrieved' })
  async getMyFollowing(@Request() req): Promise<any[]> {
    const profile = await this.userProfileService.getProfileByUserId(req.user.id);
    return this.socialService.getFollowing(profile.id);
  }

  @Get(':userId/followers')
  @ApiOperation({ summary: 'Get user followers' })
  @ApiResponse({ status: 200, description: 'Followers retrieved' })
  async getUserFollowers(
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<any[]> {
    const profile = await this.userProfileService.getProfileByUserId(userId);
    return this.socialService.getFollowers(profile.id);
  }

  @Get(':userId/following')
  @ApiOperation({ summary: 'Get users followed by user' })
  @ApiResponse({ status: 200, description: 'Following retrieved' })
  async getUserFollowing(
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<any[]> {
    const profile = await this.userProfileService.getProfileByUserId(userId);
    return this.socialService.getFollowing(profile.id);
  }

  @Get('me/network')
  @ApiOperation({ summary: 'Get my network' })
  @ApiResponse({ status: 200, description: 'Network retrieved' })
  async getMyNetwork(@Request() req): Promise<UserNetworkDto> {
    const profile = await this.userProfileService.getProfileByUserId(req.user.id);
    return this.socialService.getUserNetwork(profile.id);
  }

  @Get('me/suggested')
  @ApiOperation({ summary: 'Get suggested users to follow' })
  @ApiResponse({ status: 200, description: 'Suggestions retrieved' })
  async getSuggestedUsers(@Request() req): Promise<any[]> {
    const profile = await this.userProfileService.getProfileByUserId(req.user.id);
    return this.socialService.getSuggestedUsers(profile.id);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get my social stats' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getMySocialStats(@Request() req): Promise<SocialStatsDto> {
    const profile = await this.userProfileService.getProfileByUserId(req.user.id);
    return this.socialService.getSocialStats(profile.id);
  }

  @Get(':userId/stats')
  @ApiOperation({ summary: 'Get user social stats' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getUserSocialStats(
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<SocialStatsDto> {
    const profile = await this.userProfileService.getProfileByUserId(userId);
    return this.socialService.getSocialStats(profile.id);
  }

  // Block Endpoints

  @Post(':userId/block')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 201, description: 'User blocked' })
  async blockUser(
    @Request() req,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<FollowResponseDto> {
    const blockerProfile = await this.userProfileService.getProfileByUserId(
      req.user.id,
    );
    const blockedProfile = await this.userProfileService.getProfileByUserId(userId);
    return this.socialService.blockUser(blockerProfile.id, blockedProfile.id);
  }

  @Post(':userId/unblock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, description: 'User unblocked' })
  async unblockUser(
    @Request() req,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<void> {
    const unblockerProfile = await this.userProfileService.getProfileByUserId(
      req.user.id,
    );
    const blockedProfile = await this.userProfileService.getProfileByUserId(userId);
    return this.socialService.unblockUser(unblockerProfile.id, blockedProfile.id);
  }

  // Mute Endpoints

  @Post(':userId/mute')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Mute a user' })
  @ApiResponse({ status: 201, description: 'User muted' })
  async muteUser(
    @Request() req,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<FollowResponseDto> {
    const muterProfile = await this.userProfileService.getProfileByUserId(
      req.user.id,
    );
    const mutedProfile = await this.userProfileService.getProfileByUserId(userId);
    return this.socialService.muteUser(muterProfile.id, mutedProfile.id);
  }

  @Post(':userId/unmute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unmute a user' })
  @ApiResponse({ status: 200, description: 'User unmuted' })
  async unmuteUser(
    @Request() req,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<void> {
    const unmutterProfile = await this.userProfileService.getProfileByUserId(
      req.user.id,
    );
    const mutedProfile = await this.userProfileService.getProfileByUserId(userId);
    return this.socialService.unmuteUser(unmutterProfile.id, mutedProfile.id);
  }

  // Mutual Connections

  @Get(':userId/mutual')
  @ApiOperation({ summary: 'Get mutual connections with a user' })
  @ApiResponse({ status: 200, description: 'Mutual connections retrieved' })
  async getMutualConnections(
    @Request() req,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<any[]> {
    const userProfile = await this.userProfileService.getProfileByUserId(
      req.user.id,
    );
    const otherProfile = await this.userProfileService.getProfileByUserId(userId);
    return this.socialService.getMutualConnections(
      userProfile.id,
      otherProfile.id,
    );
  }
}
