import { Controller, Get, Post, Param, Body, Delete, UseGuards, Req, Patch, Put, Query as NestQuery, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CreateForumCategoryDto } from './dto/create-forum-category.dto';
import { CreateForumTopicDto } from './dto/create-forum-topic.dto';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { CreateForumCommentDto } from './dto/create-forum-comment.dto';
import { CreatePostVoteDto } from './dto/create-post-vote.dto';
import { CreatePostReactionDto } from './dto/create-post-reaction.dto';
import { ForumSearchResultDto } from './dto/forum-search-result.dto';
import { ForumsService } from './forum.service';
import { UserRole } from '../users/enums/userRole.enum';
import { ForumTopic } from '../topic/entities/forum-topic.entity';
import { CreateCommentVoteDto } from './dto/create-comment-vote.dto';
import { CreateCommentReactionDto } from './dto/create-comment-reaction.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// DTOs for moderation bodies
class UpdatePostModerationDto {
  content: string;
}

class LockPostModerationDto {
  isLocked: boolean;
}

class PinTopicModerationDto {
  isPinned: boolean;
}

class CloseTopicModerationDto {
  isClosed: boolean;
}

@ApiTags('forums')
@Controller('forums')
export class ForumsController {
  constructor(private forumsService: ForumsService) {}

  // Forum Categories Endpoints
  @Post('category')
  async createCategory(@Body() dto: CreateForumCategoryDto) {
    return this.forumsService.createCategory(dto);
  }

  @Get('categories')
  async findAllCategories() {
    return this.forumsService.findAllCategories();
  }

  @Get('category/:id')
  async findCategoryById(@Param('id') id: string) {
    return this.forumsService.findCategoryById(id);
  }

  // Forum Topics Endpoints
  @Post('topic')
  @ApiOperation({ summary: 'Create a new forum topic' })
  @ApiResponse({ status: 201, description: 'Topic created successfully.', type: ForumTopic })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async createTopic(@Body() dto: CreateForumTopicDto) {
    return this.forumsService.createTopic(dto);
  }

  @Get('topics')
  @ApiOperation({ summary: 'Get all forum topics with pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of items to skip' })
  @ApiResponse({ status: 200, description: 'List of topics and total count.', /* schema for {topics: ForumTopic[], total: number} */ /* type: [ForumTopic] could be used if not returning total */})
  async findAllTopics(
    @NestQuery('limit') limit?: string, 
    @NestQuery('offset') offset?: string
  ) {
    const numLimit = limit ? parseInt(limit, 10) : 10;
    const numOffset = offset ? parseInt(offset, 10) : 0;
    return this.forumsService.findAllTopics(numLimit, numOffset);
  }

  @Get('topic/:id')
  @ApiOperation({ summary: 'Get a specific forum topic by ID' })
  @ApiResponse({ status: 200, description: 'The found topic.', type: ForumTopic })
  @ApiResponse({ status: 404, description: 'Topic not found.' })
  async findTopicById(@Param('id') id: string) {
    return this.forumsService.findTopicById(id);
  }

  // Forum Posts Endpoints
  @Post('post')
  async createPost(@Body() dto: CreateForumPostDto) {
    return this.forumsService.createPost(dto);
  }

  @Get('posts')
  async findAllPosts() {
    return this.forumsService.findAllPosts();
  }

  @Get('post/:id')
  async findPostById(@Param('id') id: string) {
    return this.forumsService.findPostById(id);
  }

  // Forum Comments Endpoints
  @Post('comment')
  async createComment(@Body() dto: CreateForumCommentDto) {
    return this.forumsService.createComment(dto);
  }

  @Get('comments')
  async findAllComments() {
    return this.forumsService.findAllComments();
  }

  @Get('comment/:id')
  async findCommentById(@Param('id') id: string) {
    return this.forumsService.findCommentById(id);
  }

  // Vote and Reaction Endpoints (Assuming JwtAuthGuard and req.user.id for userId)
  @Post('post/:postId/vote')
  async addVoteToPost(
    @Param('postId') postId: string,
    @Body() createPostVoteDto: CreatePostVoteDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User ID not found on request. Ensure authentication.');
    return this.forumsService.addVoteToPost(userId, postId, createPostVoteDto);
  }

  @Delete('post/:postId/vote')
  async removeVoteFromPost(
    @Param('postId') postId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User ID not found on request. Ensure authentication.');
    return this.forumsService.removeVoteFromPost(userId, postId);
  }

  @Post('post/:postId/reaction')
  async addReactionToPost(
    @Param('postId') postId: string,
    @Body() createPostReactionDto: CreatePostReactionDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User ID not found on request. Ensure authentication.');
    return this.forumsService.addReactionToPost(userId, postId, createPostReactionDto);
  }

  @Delete('post/:postId/reaction/:reactionType')
  async removeReactionFromPost(
    @Param('postId') postId: string,
    @Param('reactionType') reactionType: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User ID not found on request. Ensure authentication.');
    return this.forumsService.removeReactionFromPost(userId, postId, reactionType);
  }

  @Post('comment/:commentId/vote')
  async addVoteToComment(
    @Param('commentId') commentId: string,
    @Body() createCommentVoteDto: CreateCommentVoteDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User ID not found on request. Ensure authentication.');
    return this.forumsService.addVoteToComment(userId, commentId, createCommentVoteDto);
  }

  @Delete('comment/:commentId/vote')
  async removeVoteFromComment(
    @Param('commentId') commentId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User ID not found on request. Ensure authentication.');
    return this.forumsService.removeVoteFromComment(userId, commentId);
  }

  @Post('comment/:commentId/reaction')
  async addReactionToComment(
    @Param('commentId') commentId: string,
    @Body() createCommentReactionDto: CreateCommentReactionDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User ID not found on request. Ensure authentication.');
    return this.forumsService.addReactionToComment(userId, commentId, createCommentReactionDto);
  }

  @Delete('comment/:commentId/reaction/:reactionType')
  async removeReactionFromComment(
    @Param('commentId') commentId: string,
    @Param('reactionType') reactionType: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User ID not found on request. Ensure authentication.');
    return this.forumsService.removeReactionFromComment(userId, commentId, reactionType);
  }

  // Search Endpoint
  @Get('search')
  async searchForums(
    @NestQuery('query') query: string,
    @NestQuery('type') type?: 'post' | 'topic' | 'comment',
    @NestQuery('courseId') courseId?: string,
    @NestQuery('limit') limit?: string,
    @NestQuery('offset') offset?: string,
  ): Promise<ForumSearchResultDto[]> {
    const numLimit = limit ? parseInt(limit, 10) : 10;
    const numOffset = offset ? parseInt(offset, 10) : 0;
    if (!query) {
      throw new BadRequestException('Search query must be provided.');
    }
    return this.forumsService.searchForums(query, type, courseId, numLimit, numOffset);
  }

  // Moderation Endpoints
  @Delete('admin/post/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'FORUM_MODERATOR')
  async softDeletePost(@Param('id') id: string, @Req() req: any) {
    return this.forumsService.softDeletePost(id, req.user?.id);
  }

  @Delete('admin/comment/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'FORUM_MODERATOR')
  async softDeleteComment(@Param('id') id: string, @Req() req: any) {
    return this.forumsService.softDeleteComment(id, req.user?.id);
  }

  @Patch('admin/post/:id/content')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'FORUM_MODERATOR')
  async editPostByModerator(
    @Param('id') id: string, 
    @Body() body: UpdatePostModerationDto, 
    @Req() req: any
  ) {
    return this.forumsService.editPostByModerator(id, body.content, req.user?.id);
  }

  @Patch('admin/post/:id/lock')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'FORUM_MODERATOR')
  async lockPostByModerator(
    @Param('id') id: string, 
    @Body() body: LockPostModerationDto, 
    @Req() req: any
  ) {
    return this.forumsService.lockPostByModerator(id, body.isLocked, req.user?.id);
  }

  @Patch('admin/topic/:id/pin')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'FORUM_MODERATOR')
  async pinTopicByModerator(
    @Param('id') id: string, 
    @Body() body: PinTopicModerationDto, 
    @Req() req: any
  ) {
    return this.forumsService.pinTopicByModerator(id, body.isPinned, req.user?.id);
  }

  @Patch('admin/topic/:id/close')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'FORUM_MODERATOR')
  async closeTopicByModerator(
    @Param('id') id: string, 
    @Body() body: CloseTopicModerationDto, 
    @Req() req: any
  ) {
    return this.forumsService.closeTopicByModerator(id, body.isClosed, req.user?.id);
  }
}
