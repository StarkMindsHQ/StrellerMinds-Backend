import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumPost } from './entities/forum-post.entity';
import { CreateForumPostDto } from 'src/forum/dto/create-forum-post.dto';
import { PostReaction } from './entities/forum-post-reaction.entity';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(ForumPost)
    private readonly postRepository: Repository<ForumPost>,
    @InjectRepository(PostReaction)
    private readonly reactionRepository: Repository<PostReaction>,
  ) {}

  async createPost(createPostDto: CreateForumPostDto): Promise<ForumPost> {
    const post = this.postRepository.create({
      ...createPostDto,
      topic: { id: createPostDto.topicId },
      author: { id: createPostDto.authorId },
    });
    return this.postRepository.save(post);
  }

  async reactToPost(
    postId: string,
    userId: string,
    reactionType: string,
  ): Promise<PostReaction> {
    const post = await this.postRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const reaction = this.reactionRepository.create({
      user: { id: userId },
      post: { id: postId },
      type: reactionType,
    });

    return this.reactionRepository.save(reaction);
  }
}
