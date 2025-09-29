import { Query, QueryMetadata } from '../../base/query.base';

export interface GetUserEnrollmentsParameters {
  userId: string;
  status?: 'active' | 'completed' | 'cancelled' | 'expired';
  courseCategory?: string;
  enrollmentType?: 'free' | 'paid' | 'subscription';
  sortBy?: 'enrolledAt' | 'lastAccessed' | 'progress' | 'courseName';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  includeProgress?: boolean;
  includeCourseDetails?: boolean;
}

export class GetUserEnrollmentsQuery extends Query {
  constructor(
    private readonly parameters: GetUserEnrollmentsParameters,
    metadata: Partial<QueryMetadata> = {},
  ) {
    super(metadata);
  }

  validate(): void {
    if (!this.parameters.userId) {
      throw new Error('User ID is required');
    }

    if (this.parameters.page && this.parameters.page < 1) {
      throw new Error('Page must be greater than 0');
    }

    if (this.parameters.limit && (this.parameters.limit < 1 || this.parameters.limit > 100)) {
      throw new Error('Limit must be between 1 and 100');
    }

    if (this.parameters.status && !['active', 'completed', 'cancelled', 'expired'].includes(this.parameters.status)) {
      throw new Error('Invalid status filter');
    }

    if (this.parameters.enrollmentType && !['free', 'paid', 'subscription'].includes(this.parameters.enrollmentType)) {
      throw new Error('Invalid enrollment type filter');
    }

    if (this.parameters.sortBy && !['enrolledAt', 'lastAccessed', 'progress', 'courseName'].includes(this.parameters.sortBy)) {
      throw new Error('Invalid sort field');
    }

    if (this.parameters.sortOrder && !['asc', 'desc'].includes(this.parameters.sortOrder)) {
      throw new Error('Invalid sort order');
    }
  }

  getParameters(): GetUserEnrollmentsParameters {
    return this.parameters;
  }
}
