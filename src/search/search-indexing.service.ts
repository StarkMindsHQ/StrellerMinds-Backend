/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../courses/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { ForumPost } from '../post/entities/forum-post.entity';
import { ForumTopic } from '../topic/entities/forum-topic.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class SearchIndexingService {
  private readonly logger = new Logger(SearchIndexingService.name);

  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ForumPost)
    private forumPostRepository: Repository<ForumPost>,
    @InjectRepository(ForumTopic)
    private forumTopicRepository: Repository<ForumTopic>,
    private eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async reindexAll() {
    this.logger.log('Starting full reindexing of all searchable content');

    try {
      await this.indexCourses();
      await this.indexUsers();
      await this.indexForumContent();

      this.logger.log('Full reindexing completed successfully');
      this.eventEmitter.emit('search.indexed.all', { timestamp: new Date() });
    } catch (error) {
      this.logger.error(
        `Error during full reindexing: ${error.message}`,
        error.stack,
      );
    }
  }

  async indexCourses() {
    this.logger.log('Indexing courses');
    const courses = await this.courseRepository.find({
      relations: ['category', 'tags', 'instructor'],
    });

    this.logger.log(`Indexed ${courses.length} courses`);
    this.eventEmitter.emit('search.indexed.courses', { count: courses.length });

    return courses.length;
  }

  async indexUsers() {
    this.logger.log('Indexing users');
    const users = await this.userRepository.find({
      relations: ['profile'],
    });

    this.logger.log(`Indexed ${users.length} users`);
    this.eventEmitter.emit('search.indexed.users', { count: users.length });

    return users.length;
  }

  async indexForumContent() {
    this.logger.log('Indexing forum content');
    const posts = await this.forumPostRepository.find({
      relations: ['topic', 'author'],
    });

    const topics = await this.forumTopicRepository.find();

    this.logger.log(
      `Indexed ${posts.length} forum posts and ${topics.length} topics`,
    );
    this.eventEmitter.emit('search.indexed.forum', {
      postsCount: posts.length,
      topicsCount: topics.length,
    });

    return { posts: posts.length, topics: topics.length };
  }

  @OnEvent('course.created')
  @OnEvent('course.updated')
  async handleCourseChange(payload: any) {
    this.logger.log(`Updating index for course: ${payload.id}`);
    await this.indexCourses();
  }

  @OnEvent('user.created')
  @OnEvent('user.updated')
  async handleUserChange(payload: any) {
    this.logger.log(`Updating index for user: ${payload.id}`);
    await this.indexUsers();
  }

  @OnEvent('forum.post.created')
  @OnEvent('forum.post.updated')
  @OnEvent('forum.topic.created')
  @OnEvent('forum.topic.updated')
  async handleForumChange(payload: any) {
    this.logger.log(`Updating index for forum content: ${payload.id}`);
    await this.indexForumContent();
  }
}
