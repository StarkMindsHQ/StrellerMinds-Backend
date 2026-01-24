import {
  Controller, Post, Get, Param, Body, Req
} from '@nestjs/common';
import { ForumService } from './forum.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { VoteDto } from './dto/vote.dto';

@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Post('threads')
  createThread(@Body() dto: CreateThreadDto, @Req() req) {
    return this.forumService.createThread(dto, req.user.id);
  }

  @Get('threads')
  getThreads() {
    return this.forumService.getThreads();
  }

  @Post('threads/:id/comments')
  addComment(
    @Param('id') threadId: string,
    @Body() dto: CreateCommentDto,
    @Req() req,
  ) {
    return this.forumService.addComment(threadId, dto, req.user.id);
  }

  @Post('vote/:userId')
  vote(
    @Param('userId') targetUserId: string,
    @Body() dto: VoteDto,
    @Req() req,
  ) {
    return this.forumService.vote(req.user.id, targetUserId, dto.vote);
  }
}
