import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case.base';
import { IUserRepository } from '../../domain/repositories/user-repository.interface';

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
  constructor(private readonly userRepository: IUserRepository) {
    super();
  }

  async execute(request: ListUsersRequest): Promise<ListUsersResponse> {
    const limit = request.limit || 20;

    let users = [];

    if (request.search) {
      users = await this.userRepository.findBySearchTerm(request.search);
    } else {
      users = await this.userRepository.findAll();
    }

    // Apply cursor-based pagination
    let filteredUsers = users;
    if (request.cursor) {
      const cursorIndex = users.findIndex((u) => u.id === request.cursor);
      if (cursorIndex !== -1) {
        filteredUsers = users.slice(cursorIndex + 1);
      }
    }

    // Check if there are more results
    const hasMore = filteredUsers.length > limit;

    // Take only the requested limit
    const paginatedUsers = hasMore ? filteredUsers.slice(0, limit) : filteredUsers;

    const userItems = paginatedUsers.map((user) => {
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

    // Generate next cursor
    const nextCursor = hasMore && userItems.length > 0 ? userItems[userItems.length - 1].id : null;

    return new ListUsersResponse(userItems, nextCursor, hasMore);
  }
}
