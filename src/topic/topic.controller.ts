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
import { Request } from 'express';
import { TopicService } from './topic.service';
import { AuthGuard } from '@nestjs/passport';
import { ForumTopic } from './entities/forum-topic.entity';
import { CreateForumTopicDto } from './dto/create-topic.dto';

@Controller('topics')
export class TopicController {
  constructor(private readonly topicService: TopicService) {}

  @Post()
  @UseGuards(AuthGuard('jwt')) // ✅ Specify 'jwt' strategy
  async createTopic(
    @Body() createTopicDto: CreateForumTopicDto,
    @Req() req: Request, // ✅ Correct decorator usage
  ) {
    return this.topicService.createTopic(createTopicDto);
  }

  @Get('category/:categoryId')
  async findTopicsByCategory(@Param('categoryId') categoryId: string) {
    // Call the service method without pagination
    return this.topicService.findTopicsByCategory(categoryId);
  }
}
