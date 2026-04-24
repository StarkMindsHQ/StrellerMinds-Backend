import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case.base';
import { IUserRepository } from '../../domain/repositories/user-repository.interface';

/**
 * List Users Use Case Request
 */
export class ListUsersRequest {
  constructor(public readonly search?: string) {}
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
  constructor(public readonly users: ListUserItem[]) {}
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
    let users = [];

    if (request.search) {
      users = await this.userRepository.findBySearchTerm(request.search);
    } else {
      users = await this.userRepository.findAll();
    }

    const userItems = users.map((user) => {
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

    return new ListUsersResponse(userItems);
  }
}
