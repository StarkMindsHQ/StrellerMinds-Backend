import { Injectable, Inject } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case.base';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user-repository.interface';

/**
 * List Users Use Case Request
 */
export class ListUsersRequest {
  constructor(
    public readonly search?: string,
    public readonly cursor?: string,
    public readonly limit?: number,
  ) {}
}

/**
 * List Users User Item
 */
export class ListUserItem {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly firstName: string | null,
    public readonly lastName: string | null,
    public readonly fullName: string,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

/**
 * List Users Use Case Response
 */
export class ListUsersResponse {
  constructor(
    public readonly users: ListUserItem[],
    public readonly nextCursor: string | null,
    public readonly hasMore: boolean,
  ) {}
}

/**
 * List Users Use Case
 * Lists users with optional search filtering
 */
@Injectable()
export class ListUsersUseCase extends UseCase<ListUsersRequest, ListUsersResponse> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository) {
    super();
  }

  async execute(request: ListUsersRequest): Promise<ListUsersResponse> {
    const limit = request.limit || 20;

    const result = request.search
      ? await this.userRepository.findBySearchTerm(request.search, limit, request.cursor)
      : await this.userRepository.findPaginated(limit, request.cursor);

    const userItems = result.items.map((user) => {
      const primitives = user.toPrimitives();
      return new ListUserItem(
        primitives.id,
        primitives.email,
        primitives.firstName,
        primitives.lastName,
        user.getFullName(),
        primitives.isActive,
        primitives.createdAt,
        primitives.updatedAt,
      );
    });

    const nextCursor = result.hasMore && userItems.length > 0 ? userItems[userItems.length - 1].id : null;

    return new ListUsersResponse(userItems, nextCursor, result.hasMore);
  }
}
