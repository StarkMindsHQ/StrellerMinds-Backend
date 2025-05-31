import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumCategory } from '../catogory/entities/forum-category.entity';
import { ForumTopic } from '../topic/entities/forum-topic.entity';
import { ForumPost } from '../post/entities/forum-post.entity';
import { ForumComment } from './entities/forum-comment.entity';
import { PostVote } from '../post/entities/forum-post-vote.entity';
import { PostReaction } from '../post/entities/forum-post-reaction.entity';
import { CreateForumCategoryDto } from './dto/create-forum-category.dto';
import { CreateForumTopicDto } from './dto/create-forum-topic.dto';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { CreateForumCommentDto } from './dto/create-forum-comment.dto';
import { CreatePostVoteDto } from './dto/create-post-vote.dto';
import { CreatePostReactionDto } from './dto/create-post-reaction.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CreateNotificationDto } from 'src/notifications/dto/create-notification.dto';
import { NotificationType, NotificationStatus } from 'src/notifications/entities/notification.entity';
import { ForumSearchResultDto } from './dto/forum-search-result.dto';
import { User } from 'src/users/entities/user.entity';
import { CreateCommentVoteDto } from './dto/create-comment-vote.dto';
import { CreateCommentReactionDto } from './dto/create-comment-reaction.dto';
import { CommentVote } from './entities/forum-comment-vote.entity';
import { CommentReaction } from './entities/forum-comment-reaction.entity';
import { AuditLogService } from 'src/audit/services/audit.log.service';

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
    @InjectRepository(PostVote)
    private postVoteRepository: Repository<PostVote>,
    @InjectRepository(PostReaction)
    private postReactionRepository: Repository<PostReaction>,
    @InjectRepository(CommentVote)
    private commentVoteRepository: Repository<CommentVote>,
    @InjectRepository(CommentReaction)
    private commentReactionRepository: Repository<CommentReaction>,
    private notificationsService: NotificationsService,
    private auditLogService: AuditLogService,
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

  async findAllTopics(limit: number = 10, offset: number = 0): Promise<{topics: ForumTopic[], total: number}> {
    const [topics, total] = await this.topicRepository.findAndCount({
      take: limit,
      skip: offset,
      // Add relations or order as needed, e.g., relations: ['creator', 'category'], order: { createdAt: 'DESC' }
    });
    return { topics, total };
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
    const savedPost = await this.postRepository.save(post);

    // Notification: Notify topic creator if not the post author
    const topic = await this.findTopicById(dto.topicId);
    if (topic.creator.id !== dto.authorId) {
      const notificationDto: CreateNotificationDto = {
        userId: topic.creator.id,
        title: `New reply in your topic: ${topic.title}`,
        content: `A new post was added: "${savedPost.content.substring(0, 50)}..."`,
        types: [NotificationType.IN_APP, NotificationType.EMAIL],
        category: 'FORUM_REPLY',
        metadata: { postId: savedPost.id, topicId: topic.id },
      };
      try {
        await this.notificationsService.create(notificationDto);
      } catch (error) {
        console.error('Failed to send notification for new post in topic:', error);
      }
    }

    // Notification: Mentions in post content
    const mentionedUsernames = extractMentions(savedPost.content);
    if (mentionedUsernames.length > 0) {
      for (const username of mentionedUsernames) {
        try {
          const user = await this.notificationsService.getUserByUsername(username);
          if (user && user.id !== dto.authorId) {
            const mentionNotification: CreateNotificationDto = {
              userId: user.id,
              title: `You were mentioned in a forum post`,
              content: `You were mentioned in a post: "${savedPost.content.substring(0, 50)}..."`,
              types: [NotificationType.IN_APP],
              category: 'FORUM_MENTION',
              metadata: { postId: savedPost.id, topicId: topic.id },
            };
            await this.notificationsService.create(mentionNotification);
          }
        } catch (err) {
          // Ignore if user not found
        }
      }
    }

    return savedPost;
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
    const savedComment = await this.commentRepository.save(comment);

    // Notification: Notify post author if not the comment author
    const post = await this.findPostById(dto.postId);
    if (post.author.id !== dto.authorId) {
      const notificationDto: CreateNotificationDto = {
        userId: post.author.id,
        title: `New comment on your post`,
        content: `A new comment was added: "${savedComment.content.substring(0, 50)}..."`,
        types: [NotificationType.IN_APP, NotificationType.EMAIL],
        category: 'FORUM_COMMENT',
        metadata: { postId: post.id, commentId: savedComment.id },
      };
      try {
        await this.notificationsService.create(notificationDto);
      } catch (error) {
        console.error('Failed to send notification for new comment on post:', error);
      }
    }

    // Notification: Notify other commenters on the same post (excluding current commenter and post author)
    const otherCommenters = await this.commentRepository.createQueryBuilder('comment')
      .select('DISTINCT comment.authorId', 'authorId')
      .where('comment.postId = :postId', { postId: dto.postId })
      .andWhere('comment.authorId != :currentAuthorId', { currentAuthorId: dto.authorId })
      .getRawMany();
    for (const commenter of otherCommenters) {
      if (commenter.authorId !== post.author.id) {
        const notificationDto: CreateNotificationDto = {
          userId: commenter.authorId,
          title: `New comment on a post you commented on`,
          content: `A new comment was added: "${savedComment.content.substring(0, 50)}..."`,
          types: [NotificationType.IN_APP],
          category: 'FORUM_COMMENT',
          metadata: { postId: post.id, commentId: savedComment.id },
        };
        try {
          await this.notificationsService.create(notificationDto);
        } catch (error) {
          // Ignore errors for other commenters
        }
      }
    }

    // Notification: Mentions in comment content
    const mentionedUsernames = extractMentions(savedComment.content);
    if (mentionedUsernames.length > 0) {
      for (const username of mentionedUsernames) {
        try {
          const user = await this.notificationsService.getUserByUsername(username);
          if (user && user.id !== dto.authorId) {
            const mentionNotification: CreateNotificationDto = {
              userId: user.id,
              title: `You were mentioned in a forum comment`,
              content: `You were mentioned in a comment: "${savedComment.content.substring(0, 50)}..."`,
              types: [NotificationType.IN_APP],
              category: 'FORUM_MENTION',
              metadata: { postId: post.id, commentId: savedComment.id },
            };
            await this.notificationsService.create(mentionNotification);
          }
        } catch (err) {
          // Ignore if user not found
        }
      }
    }

    return savedComment;
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

  // Post Votes and Reactions
  async addVoteToPost(userId: string, postId: string, createPostVoteDto: CreatePostVoteDto): Promise<PostVote> {
    const { isUpvote } = createPostVoteDto;
    const post = await this.findPostById(postId);
    // TODO: Ensure user exists, or rely on auth guard + user object from request

    const existingVote = await this.postVoteRepository.findOne({ where: { user: { id: userId }, post: { id: postId } } });

    if (existingVote) {
      // If vote type is the same, do nothing or throw error? For now, let's update if different, or throw conflict.
      if (existingVote.isUpvote === isUpvote) {
        throw new ConflictException('User has already voted this way on this post.');
      }
      // If different, remove old vote and add new one (or update existing one)
      await this.postVoteRepository.remove(existingVote);
      const scoreChange = existingVote.isUpvote ? -1 : 1; // Revert old vote
      post.voteScore += scoreChange;
    }

    const newVote = this.postVoteRepository.create({ user: { id: userId }, post: { id: postId }, isUpvote });
    const savedVote = await this.postVoteRepository.save(newVote);

    // Update voteScore on ForumPost
    const scoreChange = isUpvote ? 1 : -1;
    post.voteScore += scoreChange;
    await this.postRepository.save(post);

    return savedVote;
  }

  async removeVoteFromPost(userId: string, postId: string): Promise<void> {
    const post = await this.findPostById(postId);
    const vote = await this.postVoteRepository.findOne({ where: { user: { id: userId }, post: { id: postId } } });

    if (!vote) {
      throw new NotFoundException('Vote not found for this user and post.');
    }

    const scoreChange = vote.isUpvote ? -1 : 1; // Revert vote score change
    post.voteScore += scoreChange;
    await this.postRepository.save(post);

    await this.postVoteRepository.remove(vote);
  }

  async addReactionToPost(userId: string, postId: string, createPostReactionDto: CreatePostReactionDto): Promise<PostReaction> {
    const { reactionType } = createPostReactionDto;
    await this.findPostById(postId); // Ensure post exists
    // TODO: Ensure user exists

    // The @Unique constraint in PostReaction entity handles user reacting once with a specific type.
    // We can still check here to provide a cleaner error message.
    const existingReaction = await this.postReactionRepository.findOne({
      where: { user: { id: userId }, post: { id: postId }, reactionType },
    });

    if (existingReaction) {
      throw new ConflictException('User has already reacted this way to this post.');
    }

    const newReaction = this.postReactionRepository.create({ user: { id: userId }, post: { id: postId }, reactionType });
    return this.postReactionRepository.save(newReaction);
  }

  async removeReactionFromPost(userId: string, postId: string, reactionType: string): Promise<void> {
    // Ensure post exists - not strictly necessary for delete but good practice
    await this.findPostById(postId); 
    const reaction = await this.postReactionRepository.findOne({
      where: { user: { id: userId }, post: { id: postId }, reactionType },
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found for this user, post, and reaction type.');
    }
    await this.postReactionRepository.remove(reaction);
  }

  // Comment Votes and Reactions
  async addVoteToComment(userId: string, commentId: string, createCommentVoteDto: CreateCommentVoteDto): Promise<CommentVote> {
    const { isUpvote } = createCommentVoteDto;
    const comment = await this.findCommentById(commentId);
    const existingVote = await this.commentVoteRepository.findOne({ where: { user: { id: userId }, comment: { id: commentId } } });
    if (existingVote) {
      if (existingVote.isUpvote === isUpvote) {
        throw new ConflictException('User has already voted this way on this comment.');
      }
      await this.commentVoteRepository.remove(existingVote);
      const scoreChange = existingVote.isUpvote ? -1 : 1;
      comment.voteScore += scoreChange;
    }
    const newVote = this.commentVoteRepository.create({ user: { id: userId }, comment: { id: commentId }, isUpvote });
    const savedVote = await this.commentVoteRepository.save(newVote);
    const scoreChange = isUpvote ? 1 : -1;
    comment.voteScore += scoreChange;
    await this.commentRepository.save(comment);
    return savedVote;
  }

  async removeVoteFromComment(userId: string, commentId: string): Promise<void> {
    const comment = await this.findCommentById(commentId);
    const vote = await this.commentVoteRepository.findOne({ where: { user: { id: userId }, comment: { id: commentId } } });
    if (!vote) {
      throw new NotFoundException('Vote not found for this user and comment.');
    }
    const scoreChange = vote.isUpvote ? -1 : 1;
    comment.voteScore += scoreChange;
    await this.commentRepository.save(comment);
    await this.commentVoteRepository.remove(vote);
  }

  async addReactionToComment(userId: string, commentId: string, createCommentReactionDto: CreateCommentReactionDto): Promise<CommentReaction> {
    const { reactionType } = createCommentReactionDto;
    await this.findCommentById(commentId);
    const existingReaction = await this.commentReactionRepository.findOne({ where: { user: { id: userId }, comment: { id: commentId }, reactionType } });
    if (existingReaction) {
      throw new ConflictException('User has already reacted this way to this comment.');
    }
    const newReaction = this.commentReactionRepository.create({ user: { id: userId }, comment: { id: commentId }, reactionType });
    return this.commentReactionRepository.save(newReaction);
  }

  async removeReactionFromComment(userId: string, commentId: string, reactionType: string): Promise<void> {
    await this.findCommentById(commentId);
    const reaction = await this.commentReactionRepository.findOne({ where: { user: { id: userId }, comment: { id: commentId }, reactionType } });
    if (!reaction) {
      throw new NotFoundException('Reaction not found for this user, comment, and reaction type.');
    }
    await this.commentReactionRepository.remove(reaction);
  }

  // Moderation Methods
  async softDeletePost(postId: string, moderatorId?: string): Promise<ForumPost> {
    const post = await this.findPostById(postId);
    const originalAuthorId = post.author.id;
    post.isDeleted = true;
    const savedPost = await this.postRepository.save(post);

    if (moderatorId && originalAuthorId) {
      const notificationDto: CreateNotificationDto = {
        userId: originalAuthorId,
        title: 'Your post has been removed',
        content: `Your post titled "${post.content.substring(0,30)}..." was removed by a moderator.`,
        types: [NotificationType.IN_APP],
        category: 'MODERATION_ACTION',
        metadata: { postId: post.id },
      };
      try {
        await this.notificationsService.create(notificationDto);
      } catch (error) {
        console.error('Failed to send notification for post deletion:', error);
      }
    }
    await this.auditLogService.createLog({
      action: 'POST_SOFT_DELETED',
      entityType: 'ForumPost',
      entityId: postId,
      performedBy: moderatorId,
      details: { reason: 'Soft deleted by moderator' }
    });
    return savedPost;
  }

  async softDeleteComment(commentId: string, moderatorId?: string): Promise<ForumComment> {
    const comment = await this.findCommentById(commentId);
    comment.isDeleted = true;
    const savedComment = await this.commentRepository.save(comment);

    if (moderatorId && comment.author.id) {
      const notificationDto: CreateNotificationDto = {
        userId: comment.author.id,
        title: 'Your comment has been removed',
        content: `Your comment "${comment.content.substring(0,30)}..." was removed by a moderator.`,
        types: [NotificationType.IN_APP],
        category: 'MODERATION_ACTION',
        metadata: { commentId: comment.id },
      };
      try {
        await this.notificationsService.create(notificationDto);
      } catch (error) {
        console.error('Failed to send notification for comment deletion:', error);
      }
    }
    await this.auditLogService.createLog({
      action: 'COMMENT_SOFT_DELETED',
      entityType: 'ForumComment',
      entityId: commentId,
      performedBy: moderatorId,
      details: { reason: 'Soft deleted by moderator' }
    });
    return savedComment;
  }

  async editPostByModerator(postId: string, content: string, moderatorId?: string): Promise<ForumPost> {
    const post = await this.findPostById(postId);
    if (post.isLocked) {
      throw new BadRequestException('Post is locked and cannot be edited.');
    }
    post.content = content;
    await this.auditLogService.createLog({
      action: 'POST_EDITED',
      entityType: 'ForumPost',
      entityId: postId,
      performedBy: moderatorId,
      details: { content: content }
    });
    return this.postRepository.save(post);
  }

  async lockPostByModerator(postId: string, isLocked: boolean, moderatorId?: string): Promise<ForumPost> {
    const post = await this.findPostById(postId);
    post.isLocked = isLocked;
    await this.auditLogService.createLog({
      action: 'POST_LOCK_STATUS_CHANGED',
      entityType: 'ForumPost',
      entityId: postId,
      performedBy: moderatorId,
      details: { isLocked: isLocked }
    });
    return this.postRepository.save(post);
  }

  async pinTopicByModerator(topicId: string, isPinned: boolean, moderatorId?: string): Promise<ForumTopic> {
    const topic = await this.findTopicById(topicId);
    topic.isPinned = isPinned;
    await this.auditLogService.createLog({
      action: 'TOPIC_PIN_STATUS_CHANGED',
      entityType: 'ForumTopic',
      entityId: topicId,
      performedBy: moderatorId,
      details: { isPinned: isPinned }
    });
    return this.topicRepository.save(topic);
  }

  async closeTopicByModerator(topicId: string, isClosed: boolean, moderatorId?: string): Promise<ForumTopic> {
    const topic = await this.findTopicById(topicId);
    topic.isClosed = isClosed;
    await this.auditLogService.createLog({
      action: 'TOPIC_CLOSE_STATUS_CHANGED',
      entityType: 'ForumTopic',
      entityId: topicId,
      performedBy: moderatorId,
      details: { isClosed: isClosed }
    });
    return this.topicRepository.save(topic);
  }

  async searchForums(
    query: string, 
    type?: 'post' | 'topic' | 'comment',
    courseId?: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<ForumSearchResultDto[]> {
    const results: ForumSearchResultDto[] = [];

    // This is a simplified example. Real implementation needs database-specific FTS queries.
    // Example for PostgreSQL: .where("to_tsvector('english', entity.content) @@ plainto_tsquery('english', :query)", { query })
    // Example for MySQL: .where("MATCH(entity.content) AGAINST (:query IN NATURAL LANGUAGE MODE)", { query })

    if (!type || type === 'topic') {
      const topicQuery = this.topicRepository.createQueryBuilder('topic')
        .leftJoinAndSelect('topic.creator', 'creatorUser') // For authorName
        .where('topic.title ILIKE :query', { query: `%${query}%` }); // Basic LIKE search, replace with FTS
      if (courseId) {
        topicQuery.andWhere('topic.courseId = :courseId', { courseId });
      }
      const topics = await topicQuery.take(limit).skip(offset).getMany();
      results.push(...topics.map(t => ({
        id: t.id,
        type: 'topic',
        title: t.title,
        contentSnippet: t.title, // Or a snippet from first post?
        url: `/forums/topic/${t.id}`,
        courseId: t.courseId,
        authorName: t.creator ? `${t.creator.firstName} ${t.creator.lastName}` : undefined,
        createdAt: t.createdAt,
      } as ForumSearchResultDto)));
    }

    if (!type || type === 'post') {
      const postQuery = this.postRepository.createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'authorUser')
        .leftJoin('post.topic', 'topicRelation') // Join topic to filter by courseId if needed
        .where('post.content ILIKE :query', { query: `%${query}%` }); // Basic LIKE search, replace with FTS
      if (courseId) {
        // This assumes courseId is directly or indirectly filterable for posts (e.g., through topic)
        postQuery.andWhere('topicRelation.courseId = :courseId', { courseId });
      }
      const posts = await postQuery.take(limit).skip(offset).getMany();
      results.push(...posts.map(p => ({
        id: p.id,
        type: 'post',
        title: p.content.substring(0, 75) + '...',
        contentSnippet: p.content.substring(0, 150) + '...',
        url: `/forums/topic/${p.topic?.id}/post/${p.id}`, // p.topic might be just an ID if not eager loaded or selected
        topicId: p.topic?.id, 
        authorName: p.author ? `${p.author.firstName} ${p.author.lastName}` : undefined,
        createdAt: p.createdAt,
      } as ForumSearchResultDto)));
    }

    if (!type || type === 'comment') {
      const commentQuery = this.commentRepository.createQueryBuilder('comment')
        .leftJoinAndSelect('comment.author', 'authorUser')
        .leftJoin('comment.post', 'postRelation') // For post URL and potentially courseId through post.topic
        .leftJoin('postRelation.topic', 'topicRelation') // For courseId
        .where('comment.content ILIKE :query', { query: `%${query}%` }); // Basic LIKE search, replace with FTS
      if (courseId) {
        commentQuery.andWhere('topicRelation.courseId = :courseId', { courseId });
      }
      const comments = await commentQuery.take(limit).skip(offset).getMany();
      results.push(...comments.map(c => ({
        id: c.id,
        type: 'comment',
        contentSnippet: c.content.substring(0, 150) + '...',
        url: `/forums/topic/${(c.post as any)?.topic?.id}/post/${c.post?.id}#comment-${c.id}`,
        courseId: (c.post as any)?.topic?.courseId,
        topicId: (c.post as any)?.topic?.id,
        postId: c.post?.id,
        authorName: c.author ? `${c.author.firstName} ${c.author.lastName}` : undefined,
        createdAt: c.createdAt,
      } as ForumSearchResultDto)));
    }
    
    // Sort combined results by relevance or date, then apply limit/offset if not done per type
    // Ensure all paths return results properly
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return results.slice(0, limit); // Ensure final limit if types combined exceed it
  }

  /*
  async deletePost(postId: string) {
    return this.postRepository.delete(postId);
  }
  */
  /*
  async deleteComment(commentId: string) {
    return this.commentRepository.delete(commentId);
  }
  */
}

function extractMentions(content: string): string[] {
  // Extracts @username mentions from content
  const regex = /@([a-zA-Z0-9_]+)/g;
  const mentions = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}
