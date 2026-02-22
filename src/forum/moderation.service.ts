// src/forum/moderation.service.ts

import { Discussion, Report } from './types';
import { v4 as uuid } from 'uuid';

export class ModerationService {
  private reports: Report[] = [];

  reportPost(postId: string, reporterId: string, reason: string) {
    const report: Report = {
      id: uuid(),
      postId,
      reporterId,
      reason,
      resolved: false,
    };

    this.reports.push(report);
    return report;
  }

  lockPost(post: Discussion) {
    post.status = 'LOCKED';
  }

  deletePost(post: Discussion) {
    post.status = 'DELETED';
  }

  flagPost(post: Discussion) {
    post.status = 'FLAGGED';
  }

  resolveReport(reportId: string) {
    const report = this.reports.find((r) => r.id === reportId);
    if (report) report.resolved = true;
  }

  getReports() {
    return this.reports.filter((r) => !r.resolved);
  }
}
