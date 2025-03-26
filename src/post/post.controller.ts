/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SearchService } from 'src/search/search.service';
import { AuthGuard } from '@nestjs/passport';
import { PostService } from './post.service';
import { CreateForumPostDto } from 'src/forum/dto/create-forum-post.dto';
import { AuthenticatedRequest } from 'src/types/express-request.interface';
import { CreateReactionDto } from './dto/create-reaction.dto';

@Controller('posts')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly searchService: SearchService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createPost(
    @Body() createPostDto: CreateForumPostDto,
    @Req() req: AuthenticatedRequest, // Fix type issue
  ) {
    return this.postService.createPost(createPostDto);
  }

  @Post(':id/react')
  @UseGuards(AuthGuard('jwt'))
  async reactToPost(
    @Param('id') postId: string,
    @Body() reactionDto: CreateReactionDto,
    @Req() req: AuthenticatedRequest, // Fix type issue
  ) {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    return this.postService.reactToPost(postId, req.user.id, reactionDto.type);
  }

  @Get('search')
  async searchPosts(
    @Query('query') query: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.searchService.searchPosts(query, page, limit);
  }
}
