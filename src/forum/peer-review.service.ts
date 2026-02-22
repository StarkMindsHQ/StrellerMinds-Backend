// src/forum/peer-review.service.ts

import { Review } from './types';
import { v4 as uuid } from 'uuid';

export class PeerReviewService {
  private reviews: Review[] = [];

  addReview(reviewerId: string, postId: string, rating: number, feedback: string) {
    const review: Review = {
      id: uuid(),
      reviewerId,
      targetPostId: postId,
      rating,
      feedback,
      createdAt: new Date(),
    };

    this.reviews.push(review);
    return review;
  }

  getReviews(postId: string) {
    return this.reviews.filter((r) => r.targetPostId === postId);
  }
}
