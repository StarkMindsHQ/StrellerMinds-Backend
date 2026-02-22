import { Discussion } from './types';
import { v4 as uuid } from 'uuid';

export class DiscussionService {
  private discussions: Discussion[] = [];

  createPost(authorId: string, title: string, content: string, parentId?: string) {
    const post: Discussion = {
      id: uuid(),
      authorId,
      title,
      content,
      parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'ACTIVE',
      votes: 0,
      bookmarks: 0,
    };

    this.discussions.push(post);
    return post;
  }

  getThread(postId: string) {
    return this.discussions.filter((d) => d.id === postId || d.parentId === postId);
  }

  getAll() {
    return this.discussions.filter((d) => d.status !== 'DELETED');
  }
}
