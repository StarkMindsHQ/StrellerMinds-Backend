import { IQuery } from '../../cqrs/interfaces/query.interface';

export class GetUserByIdQuery implements IQuery {
  readonly params: {
    userId: string;
    includeProfile?: boolean;
    includeActivity?: boolean;
  };

  readonly timestamp: Date;
  readonly id: string;

  constructor(params: GetUserByIdQuery['params']) {
    this.params = params;
    this.timestamp = new Date();
    this.id = `get-user-by-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
