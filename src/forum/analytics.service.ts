// src/forum/analytics.service.ts

import { Discussion } from './types';

export class ForumAnalyticsService {
  static generateAnalytics(posts: Discussion[]) {
    return {
      totalPosts: posts.length,
      activeThreads: posts.filter((p) => !p.parentId).length,
      flaggedPosts: posts.filter((p) => p.status === 'FLAGGED').length,
    };
  }
}
