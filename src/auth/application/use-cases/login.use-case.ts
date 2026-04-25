import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case.base';
import { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { InvalidCredentialsException } from '../../domain/exceptions/auth-exceptions';

/**
 * Login Use Case Request
 */
export class LoginRequest {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

/**
 * Login Use Case Response
 */
export class LoginResponse {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly accessToken: string,
    public readonly refreshToken: string,
  ) {}
}

/**
 * Login Use Case
 * Handles user authentication
 */
@Injectable()
export class LoginUseCase extends UseCase<LoginRequest, LoginResponse> {
  constructor(private readonly userRepository: IUserRepository) {
    super();
  }

  async execute(request: LoginRequest): Promise<LoginResponse> {
    // Find user by email
    const user = await this.userRepository.findByEmail(request.email);

    if (!user) {
      throw new InvalidCredentialsException();
    }

    // TODO: Verify password hash
    // const isPasswordValid = await bcrypt.compare(request.password, user.password);
    // if (!isPasswordValid) {
    //   throw new InvalidCredentialsException();
    // }

    // TODO: Generate JWT tokens
    const accessToken = 'access-token-placeholder';
    const refreshToken = 'refresh-token-placeholder';

    return new LoginResponse(user.getId(), user.getEmail(), accessToken, refreshToken);
  }
}
