import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ForumCategory } from 'src/catogory/entities/forum-category.entity';
import { ForumTopic } from 'src/topic/entities/forum-topic.entity';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateForumTopicDto } from './dto/create-topic.dto';

@Injectable()
export class TopicService {
  constructor(
    @InjectRepository(ForumTopic)
    private topicRepository: Repository<ForumTopic>,
  ) {}

  async createTopic(createTopicDto: CreateForumTopicDto): Promise<ForumTopic> {
    // Find the category by ID
    const category = await this.topicRepository.manager.findOne(ForumCategory, {
      where: { id: createTopicDto.categoryId },
    });

    // Find the creator (user) by userId
    const creator = await this.topicRepository.manager.findOne(User, {
      where: { id: createTopicDto.userId },
    });

    // If category or creator doesn't exist, throw an error
    if (!category) {
      throw new Error('Category not found');
    }
    if (!creator) {
      throw new Error('User not found');
    }

    // Create a new ForumTopic instance
    const topic = this.topicRepository.create({
      title: createTopicDto.title,
      category,
      creator, // Link the creator to the topic
      isPinned: createTopicDto.isPinned || false, // Default to false if not provided
      isClosed: createTopicDto.isClosed || false, // Default to false if not provided
    });

    // Save and return the created topic
    return this.topicRepository.save(topic);
  }

  async findTopicsByCategory(categoryId: string): Promise<ForumTopic[]> {
    // Fetch all topics by category ID without pagination
    const topics = await this.topicRepository.find({
      where: { category: { id: categoryId } },
      relations: ['creator', 'category'], // Ensure creator and category are loaded
    });

    return topics;
  }
}
