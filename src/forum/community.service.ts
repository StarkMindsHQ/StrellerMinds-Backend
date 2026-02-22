// src/forum/community.service.ts

import { Discussion } from './types';

export class CommunityService {
  vote(post: Discussion, value: 1 | -1) {
    post.votes += value;
    return post;
  }

  bookmark(post: Discussion) {
    post.bookmarks += 1;
    return post;
  }

  followUser(followerId: string, targetUserId: string) {
    return { followerId, targetUserId };
  }
}
