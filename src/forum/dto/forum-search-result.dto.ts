export class ForumSearchResultDto {
  id: string;
  type: 'post' | 'topic' | 'comment';
  title?: string; // For topics and posts (first line of content as title for post?)
  contentSnippet: string;
  url: string; // Link to the item
  courseId?: string;
  topicId?: string;
  postId?: string; // For comments
  authorName?: string;
  createdAt: Date;
} 