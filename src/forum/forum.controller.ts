import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ForumsService } from './forums.service';
import { CreateForumCategoryDto } from './dto/create-forum-category.dto';
import { CreateForumTopicDto } from './dto/create-forum-topic.dto';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { CreateForumCommentDto } from './dto/create-forum-comment.dto';

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
  async createTopic(@Body() dto: CreateForumTopicDto) {
    return this.forumsService.createTopic(dto);
  }

  @Get('topics')
  async findAllTopics() {
    return this.forumsService.findAllTopics();
  }

  @Get('topic/:id')
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
}
