import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case.base';
import { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { User } from '../../domain/entities/user.entity';
import { UserAlreadyExistsException } from '../../domain/exceptions/auth-exceptions';
import { v4 as uuidv4 } from 'uuid';

/**
 * Register Use Case Request
 */
export class RegisterRequest {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly firstName: string,
    public readonly lastName: string,
  ) {}
}

/**
 * Register Use Case Response
 */
export class RegisterResponse {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
  ) {}
}

/**
 * Register Use Case
 * Handles user registration
 */
@Injectable()
export class RegisterUseCase extends UseCase<RegisterRequest, RegisterResponse> {
  constructor(private readonly userRepository: IUserRepository) {
    super();
  }

  async execute(request: RegisterRequest): Promise<RegisterResponse> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(request.email);

    if (existingUser) {
      throw new UserAlreadyExistsException(request.email);
    }

    // TODO: Hash password
    // const hashedPassword = await bcrypt.hash(request.password, 10);

    // Create new user
    const newUser = new User(
      uuidv4(),
      request.email,
      request.firstName,
      request.lastName,
      true, // isActive
      new Date(),
      new Date(),
    );

    // Save user to repository
    const savedUser = await this.userRepository.save(newUser);

    return new RegisterResponse(
      savedUser.getId(),
      savedUser.getEmail(),
      savedUser.getFirstName() || '',
      savedUser.getLastName() || '',
    );
  }
}
