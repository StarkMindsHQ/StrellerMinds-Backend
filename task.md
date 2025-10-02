# Implement Forum/Discussion API (GitHub Issue #143)

This document outlines the steps to implement a comprehensive API for course-related discussions and community forums.

## Phase 1: Enhance Existing Entities and DTOs

The existing `ForumCategory`, `ForumTopic`, `ForumPost`, and `ForumComment` entities provide a good starting point. We need to enhance them and their corresponding DTOs to support new features.

### Step 1.1: Define `PostVote` and `PostReaction` Entities

- **Task:** Create `PostVote` and `PostReaction` entities.
- **File:** `src/post/entities/forum-post-vote.entity.ts`

  ```typescript
  import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, Unique } from 'typeorm';
  import { User } from '../../users/entities/user.entity';
  import { ForumPost } from './forum-post.entity';

  @Entity('post_votes')
  @Unique(['user', 'post']) // User can only vote once per post
  export class PostVote {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'boolean', default: true }) // true for upvote, false for downvote (optional)
    isUpvote: boolean;

    @ManyToOne(() => User, (user) => user.id, { nullable: false, onDelete: 'CASCADE' })
    user: User;

    @ManyToOne(() => ForumPost, (post) => post.votes, { nullable: false, onDelete: 'CASCADE' })
    post: ForumPost;
  }
  ```

- **File:** `src/post/entities/forum-post-reaction.entity.ts`

  ```typescript
  import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, Unique } from 'typeorm';
  import { User } from '../../users/entities/user.entity';
  import { ForumPost } from './forum-post.entity';

  @Entity('post_reactions')
  @Unique(['user', 'post', 'reactionType']) // User can only react once with a specific type per post
  export class PostReaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 50 }) // e.g., 'like', 'love', 'haha', 'wow', 'sad', 'angry'
    reactionType: string;

    @ManyToOne(() => User, (user) => user.id, { nullable: false, onDelete: 'CASCADE' })
    user: User;

    @ManyToOne(() => ForumPost, (post) => post.reactions, { nullable: false, onDelete: 'CASCADE' })
    post: ForumPost;
  }
  ```

- **Rationale:** These entities are needed for the voting/reactions feature. The `PostVote` entity will store upvotes/downvotes, and `PostReaction` will store different types of reactions.
- **Note:** Consider if a similar `CommentVote` and `CommentReaction` entity is needed for comments, or if the scope is only for posts. For now, we focus on posts.

### Step 1.2: Update `ForumPost` Entity

- **Task:** Modify `src/post/entities/forum-post.entity.ts` to correctly type `author` and `topic` and potentially add vote/reaction counts.
- **File:** `src/post/entities/forum-post.entity.ts`

  ```typescript
  // ... existing code ...
  import { User } from '../../users/entities/user.entity'; // Ensure correct import
  import { ForumTopic } from '../../topic/entities/forum-topic.entity'; // Ensure correct import
  import { PostVote } from './forum-post-vote.entity';
  import { PostReaction } from './forum-post-reaction.entity';

  @Entity('forum_posts')
  @Index('content_index', ['content'], { fulltext: true })
  export class ForumPost {
    // ... existing code ...

    @Column({ default: 0 })
    voteScore: number; // Calculated field: upvotes - downvotes

    // Many-to-One relationships
    @ManyToOne(() => User, (user) => user.id, { nullable: false, eager: true }) // Eager load author
    @Index()
    author: User;

    @ManyToOne(() => ForumTopic, (topic) => topic.posts, {
      nullable: false,
      onDelete: 'CASCADE',
      eager: true, // Eager load topic
    })
    @Index()
    topic: ForumTopic;

    // One-to-Many relationship for comments
    @OneToMany(() => ForumComment, (comment) => comment.post)
    comments: ForumComment[];

    // One-to-Many relationship for votes
    @OneToMany(() => PostVote, (vote) => vote.post)
    votes: PostVote[];

    @OneToMany(() => PostReaction, (reaction) => reaction.post)
    reactions: PostReaction[];
  }
  ```

- **Rationale:** Ensure relations are correctly typed (not `Promise<User>`). Add `voteScore` for quick sorting/display. `eager: true` can simplify queries but use with caution for performance.

### Step 1.3: Update `ForumComment` Entity

- **Task:** Modify `src/forum/entities/forum-comment.entity.ts` to correctly type `author` and `post` and add fields for reactions/votes if applicable.
- **File:** `src/forum/entities/forum-comment.entity.ts`

  ```typescript
  // ... existing code ...
  import { User } from '../../users/entities/user.entity';
  import { ForumPost } from '../../post/entities/forum-post.entity';

  @Entity('forum_comments')
  export class ForumComment {
    // ... existing code ...
    // @Column({ default: 0 }) // Already exists for likes
    // likes: number;

    // Consider adding a separate voteScore or reaction summary if comments also get complex reactions/votes
    // For now, 'likes' might suffice or be repurposed as a general vote count.

    @ManyToOne(() => User, (user) => user.id, { nullable: false, eager: true }) // Eager load author
    @Index()
    author: User;

    @ManyToOne(() => ForumPost, (post) => post.comments, {
      nullable: false,
      onDelete: 'CASCADE',
      // eager: true, // Avoid eager loading post from comment to prevent circular issues or over-fetching
    })
    @Index()
    post: ForumPost;
  }
  ```

- **Rationale:** Correctly type relations. Decide on how voting/reactions on comments will be handled.

### Step 1.4: Update DTOs

- **Task:** Review and update all DTOs in `src/forum/dto/` to reflect entity changes and new requirements (e.g., DTOs for voting/reactions).
- **Files:** `src/forum/dto/*.dto.ts`
  - `create-forum-post.dto.ts`: May need `courseId` if posts are directly tied to courses.
  - `create-forum-comment.dto.ts`: No immediate changes apparent.
  - Create new DTOs:
    - `src/forum/dto/create-post-vote.dto.ts`

      ```typescript
      import { IsBoolean, IsNotEmpty, IsUUID } from 'class-validator';

      export class CreatePostVoteDto {
        @IsNotEmpty()
        @IsUUID()
        postId: string;

        @IsBoolean()
        isUpvote: boolean; // Optional, if you implement downvotes
      }
      ```

    - `src/forum/dto/create-post-reaction.dto.ts`

      ```typescript
      import { IsNotEmpty, IsString, Length, IsUUID } from 'class-validator';

      export class CreatePostReactionDto {
        @IsNotEmpty()
        @IsUUID()
        postId: string;

        @IsNotEmpty()
        @IsString()
        @Length(1, 50)
        reactionType: string;
      }
      ```

- **Rationale:** DTOs must match the data expected by the API and the structure of the entities.

## Phase 2: Implement Core API Logic

### Step 2.1: Thread Creation and Replies

- **Task:** Ensure `POST /forums/topic` and `POST /forums/post` (for the first post in a topic) and `POST /forums/comment` work as expected. The existing structure seems to cover this.
  - `ForumsService.createTopic`: Likely creates a topic.
  - `ForumsService.createPost`: Creates a post within a topic.
  - `ForumsService.createComment`: Creates a comment on a post.
- **Verification:**
  - When a topic is created, associate it with a course (requires `courseId` field in `ForumTopic` entity and `CreateForumTopicDto`).
  - The first post of a topic could be created simultaneously with the topic or as a separate step. Clarify this flow. If separate, `CreateForumPostDto` will need `topicId`.
- **Enhancements:**
  - `ForumTopic` entity might need a `courseId` field and relation (`ManyToOne` to a `Course` entity).
  - Update `CreateForumTopicDto` to include `courseId`.
  - Update `ForumTopic` entity:

    ```typescript
    // src/topic/entities/forum-topic.entity.ts
    // ...
    // import { Course } from '../../course/entities/course.entity'; // Assuming course entity path
    // ...
    // @ManyToOne(() => Course, course => course.forumTopics) // Add relation if needed
    // @JoinColumn({ name: 'courseId' })
    // course: Course;

    // @Column() // Add if not directly relating
    // courseId: string;
    // ...
    ```

### Step 2.2: Voting/Reactions Implementation

- **Task:** Implement services and controller endpoints for voting and reactions on posts.
- **Files:**
  - `src/forum/forum.service.ts`:
    - `addVoteToPost(userId: string, postId: string, isUpvote: boolean): Promise<PostVote>`
    - `removeVoteFromPost(userId: string, postId: string): Promise<void>`
    - `addReactionToPost(userId: string, postId: string, reactionType: string): Promise<PostReaction>`
    - `removeReactionFromPost(userId: string, postId: string, reactionType: string): Promise<void>`
    - Update `ForumPost.voteScore` whenever a vote is added or removed. This can be done via a DB trigger or in the service method.
  - `src/forum/forum.controller.ts`:
    - `POST post/:postId/vote` -> `forumsService.addVoteToPost`
    - `DELETE post/:postId/vote` -> `forumsService.removeVoteFromPost` (or a `PATCH` to update vote)
    - `POST post/:postId/reaction` -> `forumsService.addReactionToPost`
    - `DELETE post/:postId/reaction/:reactionType` -> `forumsService.removeReactionFromPost`
- **Repositories:** Inject `PostVoteRepository` and `PostReactionRepository`.
- **Permissions:** Ensure only authenticated users can vote/react. A user should not be able to vote/react multiple times in the same way. (Handled by `@Unique` in entities).

## Phase 3: Moderation Features

### Step 3.1: Define Moderation Roles/Permissions

- **Task:** Integrate with the existing role/permission system or define a new one for forum moderators.
- **Considerations:**
  - What actions can moderators perform? (e.g., delete post/comment, edit post/comment, pin topic, close topic, ban user from forum).
  - How are moderators assigned? (e.g., per course, global).
- **Implementation:** This will likely involve updating `User` entity roles or creating a new `Moderator` entity linked to `User` and potentially `Course` or `ForumCategory`.

### Step 3.2: Implement Moderation Endpoints

- **Task:** Create API endpoints for moderation actions. These should be protected by moderator roles.
- **Files:**
  - `src/forum/forum.controller.ts` (or a new `forum-admin.controller.ts`):
    - `DELETE /admin/post/:id` (already partially exists, enhance with permissions)
    - `DELETE /admin/comment/:id` (already partially exists, enhance with permissions)
    - `PATCH /admin/post/:id` (for editing content, locking)
    - `PATCH /admin/topic/:id/pin`
    - `PATCH /admin/topic/:id/close`
  - `src/forum/forum.service.ts`: Implement corresponding service methods.
- **Logic:**
  - Soft delete might be preferable to hard delete for posts/comments (add an `isDeleted` flag).
  - Audit log for moderation actions (`src/audit/` seems to exist, integrate with it).

## Phase 4: Notifications

### Step 4.1: Define Notification Triggers

- **Task:** Identify events that should trigger notifications.
  - New reply to a user's post or topic.
  - New comment on a post a user commented on.
  - Mention of a user (`@username`).
  - Moderation actions (e.g., post deleted).
- **Existing System:** The codebase has `src/notifications/` and `src/notification/` directories. Investigate their capabilities.

### Step 4.2: Implement Notification Logic

- **Task:** Integrate forum actions with the notification service.
- **Implementation:**
  - In `ForumsService` methods (e.g., `createPost`, `createComment`), after successfully creating an entity, trigger a notification event.
  - This might involve calling a `NotificationService.createNotification()` method.
  - Implement logic to identify relevant users to notify (e.g., topic author, users subscribed to the topic/post).
- **User Preferences:** Allow users to configure their forum notification preferences. This requires new User Profile settings and entities/DTOs.

## Phase 5: Search Functionality

### Step 5.1: Define Searchable Fields

- **Task:** Determine what fields should be searchable.
  - Post content.
  - Topic titles.
  - Comments.
  - Optionally: author, tags.
- **Existing System:** The `ForumPost` entity already has `@Index('content_index', ['content'], { fulltext: true })`. This is a good start for searching post content using database-specific full-text search capabilities.

### Step 5.2: Implement Search Endpoint

- **Task:** Create an API endpoint for searching forum content.
- **File:** `src/forum/forum.controller.ts`:
  - `GET /search?query=<search_term>&type=<post|topic|comment>`
- **File:** `src/forum/forum.service.ts`:
  - `searchForums(query: string, type?: string, courseId?: string): Promise<SearchResult[]>`
  - Leverage TypeORM's query builder and database full-text search.
  - Consider pagination for search results.
- **Scalability:** For larger scale, consider dedicated search engines like Elasticsearch or Algolia. The existing `src/search/` directory might be relevant.

## Phase 6: Technical Guidelines and Best Practices

### Step 6.1: Scalability

- **Task:** Throughout development, design with scalability in mind.
- **Considerations:**
  - Efficient database queries (use indexes, avoid N+1 problems).
  - Pagination for all list endpoints (e.g., `findAllTopics`, `findAllPosts`). Add `limit` and `offset` query parameters.
  - Caching strategies for frequently accessed data (e.g., popular topics, categories). (NestJS has caching modules).

### Step 6.2: API Documentation

- **Task:** Document all new and modified endpoints.
- **Tools:** Use Swagger/OpenAPI. NestJS has built-in support (`@nestjs/swagger`).
- **Process:** Decorate DTOs and controller methods with `@ApiProperty()`, `@ApiOperation()`, `@ApiResponse()`, etc.

### Step 6.3: Error Handling

- **Task:** Implement proper error handling.
- **Process:**
  - Use NestJS built-in HTTP exceptions (e.g., `NotFoundException`, `BadRequestException`, `ForbiddenException`).
  - Provide clear error messages.
  - Validate incoming data using `class-validator` in DTOs. (Already in use).

### Step 6.4: Comprehensive Tests

- **Task:** Add unit and integration tests for all new functionalities.
- **Files:**
  - `*.spec.ts` files alongside services and controllers.
  - `src/forum/forum.service.spec.ts`
  - `src/forum/forum.controller.spec.ts`
- **Coverage:** Aim for high test coverage. Test edge cases and error conditions.

## General Project Structure and Conventions

- **Modules:** Ensure all new entities, services, and controllers are correctly registered in `src/forum/forum.module.ts` and that `ForumModule` is imported into the main `AppModule` (`src/app.module.ts`) or relevant feature modules.
- **TypeORM:**
  - Run migrations after entity changes: `npm run typeorm:migration:generate -- -n ForumFeatureEnhancements` (or similar command based on `package.json`).
  - Run migrations: `npm run typeorm:migration:run`.
- **Coding Standards:** Follow existing coding standards (ESLint, Prettier are configured).

This plan provides a structured approach. Each phase and step can be broken down further as development progresses.
