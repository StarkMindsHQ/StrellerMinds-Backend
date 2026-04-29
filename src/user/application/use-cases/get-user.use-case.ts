import { Injectable, Inject } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case.base';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user-repository.interface';
import { UserNotFoundException } from '../../domain/exceptions/user-exceptions';

/**
 * Get User Use Case Request
 */
export class GetUserRequest {
  constructor(public readonly userId: string) {}
}

/**
 * Get User Use Case Response
 */
export class GetUserResponse {
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
 * Get User Use Case
 * Retrieves a single user by ID
 */
@Injectable()
export class GetUserUseCase extends UseCase<GetUserRequest, GetUserResponse> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository) {
    super();
  }

  async execute(request: GetUserRequest): Promise<GetUserResponse> {
    const user = await this.userRepository.findById(request.userId);

    if (!user) {
      throw new UserNotFoundException(request.userId);
    }

    const primitives = user.toPrimitives();
    return new GetUserResponse(
      primitives.id,
      primitives.email,
      primitives.firstName,
      primitives.lastName,
      user.getFullName(),
      primitives.isActive,
      primitives.createdAt,
      primitives.updatedAt,
    );
  }
}
