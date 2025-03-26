import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumCategory } from '../catogory/entities/forum-category.entity';
import { ForumTopic } from '../topic/entities/forum-topic.entity';
import { ForumPost } from '../post/entities/forum-post.entity';
import { ForumComment } from './entities/forum-comment.entity';
import { CreateForumCategoryDto } from './dto/create-forum-category.dto';
import { CreateForumTopicDto } from './dto/create-forum-topic.dto';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { CreateForumCommentDto } from './dto/create-forum-comment.dto';

@Injectable()
export class ForumsService {
  constructor(
    @InjectRepository(ForumCategory)
    private categoryRepository: Repository<ForumCategory>,
    @InjectRepository(ForumTopic)
    private topicRepository: Repository<ForumTopic>,
    @InjectRepository(ForumPost)
    private postRepository: Repository<ForumPost>,
    @InjectRepository(ForumComment)
    private commentRepository: Repository<ForumComment>,
  ) {}

  // Forum Categories
  async createCategory(dto: CreateForumCategoryDto): Promise<ForumCategory> {
    const category = this.categoryRepository.create(dto);
    return this.categoryRepository.save(category);
  }

  async findAllCategories(): Promise<ForumCategory[]> {
    return this.categoryRepository.find();
  }

  async findCategoryById(id: string): Promise<ForumCategory> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`ForumCategory with id ${id} not found`);
    }
    return category;
  }

  // Forum Topics
  async createTopic(dto: CreateForumTopicDto): Promise<ForumTopic> {
    const topic = this.topicRepository.create(dto);
    return this.topicRepository.save(topic);
  }

  async findAllTopics(): Promise<ForumTopic[]> {
    return this.topicRepository.find();
  }

  async findTopicById(id: string): Promise<ForumTopic> {
    const topic = await this.topicRepository.findOne({ where: { id } });
    if (!topic) {
      throw new NotFoundException(`ForumTopic with id ${id} not found`);
    }
    return topic;
  }

  // Forum Posts
  async createPost(dto: CreateForumPostDto): Promise<ForumPost> {
    const post = this.postRepository.create(dto);
    return this.postRepository.save(post);
  }

  async findAllPosts(): Promise<ForumPost[]> {
    return this.postRepository.find();
  }

  async findPostById(id: string): Promise<ForumPost> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException(`ForumPost with id ${id} not found`);
    }
    return post;
  }

  // Forum Comments
  async createComment(dto: CreateForumCommentDto): Promise<ForumComment> {
    const comment = this.commentRepository.create(dto);
    return this.commentRepository.save(comment);
  }

  async findAllComments(): Promise<ForumComment[]> {
    return this.commentRepository.find();
  }

  async findCommentById(id: string): Promise<ForumComment> {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment) {
      throw new NotFoundException(`ForumComment with id ${id} not found`);
    }
    return comment;
  }

  async deletePost(postId: number) {
    return this.postRepository.delete(postId);
  }
  async deleteComment(commentId: number) {
    return this.postRepository.delete(commentId);
  }
}
