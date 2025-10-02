import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUsersDto } from '../dtos/create.users.dto';
import { updateUsersDto } from '../dtos/update.users.dto';
import {
  BaseService,
  PaginationOptions,
  PaginatedResult,
} from '../../common/services/base.service';
import { IUserService } from '../../common/interfaces/service.interface';
import { SharedUtilityService } from '../../common/services/shared-utility.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService extends BaseService<User> implements IUserService<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly sharedUtilityService: SharedUtilityService,
  ) {
    super(userRepository);
  }

  /**
   * Create a new user
   */
  public async create(createUsersDto: CreateUsersDto): Promise<User> {
    try {
      // Validate email format
      if (!this.sharedUtilityService.isValidEmail(createUsersDto.email)) {
        throw new ConflictException('Invalid email format');
      }

      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: createUsersDto.email },
        select: ['id', 'email'],
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Validate password strength
      const passwordValidation = this.sharedUtilityService.validatePasswordStrength(
        createUsersDto.password,
      );
      if (!passwordValidation.isValid) {
        throw new ConflictException(
          `Password validation failed: ${passwordValidation.errors.join(', ')}`,
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(createUsersDto.password, 10);

      // Sanitize input data
      const sanitizedData = {
        ...createUsersDto,
        password: hashedPassword,
        firstName: this.sharedUtilityService.sanitizeInput(createUsersDto.firstName),
        lastName: this.sharedUtilityService.sanitizeInput(createUsersDto.lastName),
        bio: createUsersDto.bio
          ? this.sharedUtilityService.sanitizeInput(createUsersDto.bio)
          : undefined,
      };

      return await this.createEntity(sanitizedData);
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      return this.handleError(error, 'creating user');
    }
  }

  /**
   * Find all users with pagination and filtering
   */
  public async findAll(
    options: PaginationOptions = { page: 1, limit: 10 },
    where?: FindOptionsWhere<User>,
  ): Promise<PaginatedResult<User>> {
    try {
      return await this.findEntitiesWithPagination({
        page: options.page,
        limit: options.limit,
        where,
        select: ['id', 'firstName', 'lastName', 'email', 'role', 'status', 'createdAt'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      return this.handleError(error, 'fetching users');
    }
  }

  /**
   * Find user by ID with optional relations
   */
  public async findOne(id: string, relations: string[] = []): Promise<User> {
    try {
      return await this.findEntityById(id, relations);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error, 'fetching user');
    }
  }

  /**
   * Update user by ID
   */
  public async update(id: string, updateUserDto: updateUsersDto): Promise<User> {
    try {
      // Sanitize input data
      const sanitizedData = this.sharedUtilityService.removeEmptyValues({
        ...updateUserDto,
        firstName: updateUserDto.firstName
          ? this.sharedUtilityService.sanitizeInput(updateUserDto.firstName)
          : undefined,
        lastName: updateUserDto.lastName
          ? this.sharedUtilityService.sanitizeInput(updateUserDto.lastName)
          : undefined,
        bio: updateUserDto.bio
          ? this.sharedUtilityService.sanitizeInput(updateUserDto.bio)
          : undefined,
      });

      return await this.updateEntity(id, sanitizedData);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error, 'updating user');
    }
  }

  /**
   * Delete user by ID (soft delete)
   */
  public async delete(id: string): Promise<void> {
    try {
      await this.deleteEntity(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error, 'deleting user');
    }
  }

  /**
   * Update user's refresh token
   */
  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    try {
      await this.userRepository.update(userId, { refreshToken });
    } catch (error) {
      return this.handleError(error, 'updating refresh token');
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | undefined> {
    try {
      if (!this.sharedUtilityService.isValidEmail(email)) {
        return undefined;
      }

      return await this.userRepository.findOne({
        where: { email },
        select: ['id', 'email', 'password', 'role', 'status'],
      });
    } catch (error) {
      this.logger.error(`Error finding user by email ${email}: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | undefined> {
    try {
      return await this.userRepository.findOne({
        where: { id },
        select: ['id', 'email', 'role', 'status'],
      });
    } catch (error) {
      this.logger.error(`Error finding user by ID ${id}: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    try {
      await this.userRepository.update(userId, { password: hashedPassword });
    } catch (error) {
      return this.handleError(error, 'updating password');
    }
  }

  /**
   * Update user's Stripe customer ID
   */
  async updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
    try {
      await this.userRepository.update(userId, { stripeCustomerId });
    } catch (error) {
      return this.handleError(error, 'updating stripe customer id');
    }
  }

  /**
   * Validate user credentials
   */
  async validateCredentials(email: string, password: string): Promise<boolean> {
    try {
      const user = await this.findByEmail(email);
      if (!user || !user.password) {
        return false;
      }

      return await bcrypt.compare(password, user.password);
    } catch (error) {
      this.logger.error(`Error validating credentials for ${email}: ${error.message}`);
      return false;
    }
  }

  /**
   * Find users by criteria
   */
  async findByCriteria(criteria: Record<string, any>): Promise<User[]> {
    try {
      // Sanitize criteria
      const sanitizedCriteria = Object.entries(criteria).reduce(
        (acc, [key, value]) => {
          if (typeof value === 'string') {
            acc[key] = this.sharedUtilityService.sanitizeInput(value);
          } else {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, any>,
      );

      return await this.userRepository.find({
        where: sanitizedCriteria as FindOptionsWhere<User>,
        select: ['id', 'firstName', 'lastName', 'email', 'role', 'status', 'createdAt'],
      });
    } catch (error) {
      this.logger.error(`Error finding users by criteria: ${error.message}`);
      return [];
    }
  }
}
