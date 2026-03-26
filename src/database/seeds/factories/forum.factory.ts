import { BaseFactory } from './base.factory';
import { ForumPost, ForumTopic, PostStatus } from '../../../forum/entities/forum.entity';
import { Course } from '../../../course/entities/course.entity';
import { User } from '../../../auth/entities/user.entity';

export interface ForumPostFactoryOptions {
  author?: User;
  course?: Course;
  topic?: ForumTopic;
  title?: string;
  content?: string;
  status?: PostStatus;
  isPinned?: boolean;
  isLocked?: boolean;
}

export interface ForumTopicFactoryOptions {
  name?: string;
  description?: string;
  course?: Course;
  isPrivate?: boolean;
}

/**
 * Factory for generating forum post test data
 */
export class ForumPostFactory extends BaseFactory<ForumPost> {
  private static readonly POST_TITLES = [
    'Help with Smart Contract Debugging',
    'Best Practices for Blockchain Security',
    'Understanding Consensus Mechanisms',
    'DeFi Yield Farming Strategies',
    'Web3.js vs Ethers.js Comparison',
    'Gas Optimization Techniques',
    'NFT Marketplace Development',
    'Cross-Chain Bridge Architecture',
    'Tokenomics Design Principles',
    'Blockchain Scalability Solutions',
  ];

  private static readonly POST_CONTENTS = [
    'I\'m having trouble with my smart contract. Can someone help me debug this issue?',
    'What are the best security practices for blockchain development?',
    'Can someone explain the different consensus mechanisms in simple terms?',
    'What are your favorite DeFi yield farming strategies?',
    'Which library do you prefer for Web3 development and why?',
    'How can I optimize gas costs in my smart contracts?',
    'What are the key considerations when building an NFT marketplace?',
    'Can someone explain cross-chain bridge architecture?',
    'What principles should I follow when designing tokenomics?',
    'What are the most promising blockchain scalability solutions?',
  ];

  protected getRepository() {
    return this.dataSource.getRepository(ForumPost);
  }

  async create(overrides: ForumPostFactoryOptions = {}): Promise<ForumPost> {
    const postData = this.generate(overrides);
    return await this.save(postData);
  }

  generate(overrides: ForumPostFactoryOptions = {}): ForumPost {
    const title = overrides.title || this.randomPick(ForumPostFactory.POST_TITLES);
    const content = overrides.content || this.randomPick(ForumPostFactory.POST_CONTENTS);
    const createdAt = this.randomDate();

    return {
      id: this.randomUUID(),
      author: overrides.author || null,
      course: overrides.course || null,
      topic: overrides.topic || null,
      title,
      content,
      status: overrides.status || PostStatus.PUBLISHED,
      isPinned: overrides.isPinned || false,
      isLocked: overrides.isLocked || false,
      views: this.randomNumber(0, 1000),
      likes: this.randomNumber(0, 100),
      replies: this.randomNumber(0, 50),
      tags: this.generateTags(),
      attachments: this.generateAttachments(),
      lastReplyAt: this.randomBoolean() ? this.randomDate(createdAt) : null,
      createdAt,
      updatedAt: new Date(),
    } as ForumPost;
  }

  /**
   * Generate random tags for forum posts
   */
  private generateTags(): string[] {
    const allTags = [
      'smart-contracts', 'security', 'consensus', 'defi', 'web3',
      'gas-optimization', 'nft', 'cross-chain', 'tokenomics', 'scalability',
      'solidity', 'ethereum', 'bitcoin', 'polygon', 'binance',
      'development', 'trading', 'mining', 'staking', 'yield-farming',
    ];

    return this.randomPickMany(allTags, this.randomNumber(1, 5));
  }

  /**
   * Generate random attachments
   */
  private generateAttachments(): Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }> {
    const attachmentCount = this.randomNumber(0, 3);
    const attachments = [];

    for (let i = 0; i < attachmentCount; i++) {
      const type = this.randomPick(['image', 'document', 'code', 'other']);
      attachments.push({
        name: `attachment-${i + 1}.${this.getFileExtension(type)}`,
        url: `https://attachments.strellerminds.com/${this.randomUUID()}`,
        type,
        size: this.randomNumber(1024, 10485760), // 1KB to 10MB
      });
    }

    return attachments;
  }

  /**
   * Get file extension based on type
   */
  private getFileExtension(type: string): string {
    const extensions = {
      image: 'png',
      document: 'pdf',
      code: 'js',
      other: 'txt',
    };

    return extensions[type] || 'txt';
  }

  /**
   * Create pinned post
   */
  async createPinned(overrides: ForumPostFactoryOptions = {}): Promise<ForumPost> {
    return await this.create({
      ...overrides,
      isPinned: true,
    });
  }

  /**
   * Create locked post
   */
  async createLocked(overrides: ForumPostFactoryOptions = {}): Promise<ForumPost> {
    return await this.create({
      ...overrides,
      isLocked: true,
    });
  }

  /**
   * Create popular post (high views and likes)
   */
  async createPopular(overrides: ForumPostFactoryOptions = {}): Promise<ForumPost> {
    const post = await this.create(overrides);
    post.views = this.randomNumber(500, 1000);
    post.likes = this.randomNumber(50, 100);
    post.replies = this.randomNumber(20, 50);
    return await this.save(post);
  }
}

/**
 * Factory for generating forum topic test data
 */
export class ForumTopicFactory extends BaseFactory<ForumTopic> {
  private static readonly TOPIC_NAMES = [
    'General Discussion',
    'Technical Support',
    'Project Showcases',
    'Career Opportunities',
    'Study Groups',
    'Announcements',
    'Resources & Tutorials',
    'Market Analysis',
    'Development Tools',
    'Best Practices',
  ];

  private static readonly TOPIC_DESCRIPTIONS = [
    'General discussions about blockchain technology and cryptocurrency',
    'Get help with technical issues and debugging',
    'Share your projects and get feedback from the community',
    'Job postings and career opportunities in blockchain',
    'Form study groups and collaborate on learning',
    'Important announcements and updates',
    'Share useful resources and tutorials',
    'Analysis of market trends and price movements',
    'Discussion about development tools and frameworks',
    'Share best practices and learn from others',
  ];

  protected getRepository() {
    return this.dataSource.getRepository(ForumTopic);
  }

  async create(overrides: ForumTopicFactoryOptions = {}): Promise<ForumTopic> {
    const topicData = this.generate(overrides);
    return await this.save(topicData);
  }

  generate(overrides: ForumTopicFactoryOptions = {}): ForumTopic {
    const name = overrides.name || this.randomPick(ForumTopicFactory.TOPIC_NAMES);
    const description = overrides.description || this.randomPick(ForumTopicFactory.TOPIC_DESCRIPTIONS);

    return {
      id: this.randomUUID(),
      name,
      description,
      course: overrides.course || null,
      isPrivate: overrides.isPrivate || false,
      postCount: 0,
      lastActivityAt: new Date(),
      createdAt: this.randomDate(),
      updatedAt: new Date(),
    } as ForumTopic;
  }

  /**
   * Create private topic
   */
  async createPrivate(overrides: ForumTopicFactoryOptions = {}): Promise<ForumTopic> {
    return await this.create({
      ...overrides,
      isPrivate: true,
    });
  }

  /**
   * Create course-specific topic
   */
  async createForCourse(course: Course, overrides: ForumTopicFactoryOptions = {}): Promise<ForumTopic> {
    return await this.create({
      ...overrides,
      course,
      name: overrides.name || `${course.title} Discussion`,
      description: overrides.description || `Discussion forum for ${course.title}`,
    });
  }
}
