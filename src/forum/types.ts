// src/forum/types.ts

export type PostStatus = 'ACTIVE' | 'LOCKED' | 'DELETED' | 'FLAGGED';

export interface User {
  id: string;
  name: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
}

export interface Discussion {
  id: string;
  authorId: string;
  title: string;
  content: string;
  parentId?: string; // for threaded replies
  createdAt: Date;
  updatedAt: Date;
  status: PostStatus;
  votes: number;
  bookmarks: number;
}

export interface Question extends Discussion {
  acceptedAnswerId?: string;
}

export interface Answer extends Discussion {
  questionId: string;
}

export interface Review {
  id: string;
  reviewerId: string;
  targetPostId: string;
  rating: number; // 1–5
  feedback: string;
  createdAt: Date;
}

export interface Report {
  id: string;
  postId: string;
  reporterId: string;
  reason: string;
  resolved: boolean;
}

export interface ForumAnalytics {
  totalPosts: number;
  totalUsers: number;
  activeThreads: number;
  flaggedPosts: number;
}
