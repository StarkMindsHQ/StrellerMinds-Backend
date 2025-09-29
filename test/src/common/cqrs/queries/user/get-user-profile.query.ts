import { Query, QueryMetadata } from '../../base/query.base';

export interface GetUserProfileParameters {
  userId: string;
  includeEnrollments?: boolean;
  includeCertificates?: boolean;
  includeProgress?: boolean;
  includePreferences?: boolean;
}

export class GetUserProfileQuery extends Query {
  constructor(
    private readonly parameters: GetUserProfileParameters,
    metadata: Partial<QueryMetadata> = {},
  ) {
    super(metadata);
  }

  validate(): void {
    if (!this.parameters.userId) {
      throw new Error('User ID is required');
    }
  }

  getParameters(): GetUserProfileParameters {
    return this.parameters;
  }
}
