import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TracingService } from '../tracing/tracing.service';
import { TracedDatabaseService } from '../tracing/traced-database.service';
import { TraceDatabase } from '../tracing/tracing.decorators';
import { User } from './entities/user.entity';

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
}

@Injectable()
export class UsersTracedService {
  private readonly logger = new Logger(UsersTracedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tracingService: TracingService,
    private readonly tracedDatabaseService: TracedDatabaseService,
  ) {}

  /**
   * Create a new user with tracing
   */
  @TraceDatabase('create', 'users')
  async createUser(dto: CreateUserDto): Promise<User> {
    return this.tracingService.withSpan(
      'users.createUser',
      async (span) => {
        span.setAttributes({
          'user.email': dto.email,
          'user.first_name': dto.firstName,
          'user.last_name': dto.lastName,
          'user.operation': 'create',
        });

        try {
          const startTime = Date.now();

          // Create user entity
          const user = this.userRepository.create({
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            password: dto.password, // In real app, this would be hashed
          });

          // Save user to database with tracing
          const savedUser = await this.tracedDatabaseService.query(
            'INSERT INTO users (email, first_name, last_name, password, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
            [user.email, user.firstName, user.lastName, user.password],
            {
              table: 'users',
              operation: 'insert',
              includeParams: true,
              includeResult: true,
            },
          );

          const duration = Date.now() - startTime;

          span.setAttributes({
            'user.id': savedUser[0].id,
            'user.created_at': savedUser[0].created_at,
            'user.operation.duration_ms': duration,
            'user.operation.success': true,
          });

          this.logger.log(`User created: ${savedUser[0].id}`, {
            email: dto.email,
            firstName: dto.firstName,
          });

          return savedUser[0];
        } catch (error) {
          span.setAttributes({
            'user.operation.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          this.logger.error('Failed to create user', {
            error: error.message,
            email: dto.email,
          });

          throw error;
        }
      },
      {
        'db.table': 'users',
        'db.operation': 'create',
      },
    );
  }

  /**
   * Find user by ID with tracing
   */
  @TraceDatabase('select', 'users')
  async findUserById(id: string): Promise<User | null> {
    return this.tracingService.withSpan(
      'users.findUserById',
      async (span) => {
        span.setAttributes({
          'user.id': id,
          'user.operation': 'findById',
        });

        try {
          const startTime = Date.now();

          const result = await this.tracedDatabaseService.query(
            'SELECT * FROM users WHERE id = $1',
            [id],
            {
              table: 'users',
              operation: 'select',
              includeParams: true,
              includeResult: true,
            },
          );

          const duration = Date.now() - startTime;
          const user = result[0] || null;

          span.setAttributes({
            'user.found': !!user,
            'user.operation.duration_ms': duration,
            'user.operation.success': true,
          });

          if (user) {
            span.setAttributes({
              'user.email': user.email,
              'user.first_name': user.first_name,
              'user.last_name': user.last_name,
            });
          }

          return user;
        } catch (error) {
          span.setAttributes({
            'user.operation.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          throw error;
        }
      },
      {
        'db.table': 'users',
        'db.operation': 'findById',
      },
    );
  }

  /**
   * Find user by email with tracing
   */
  @TraceDatabase('select', 'users')
  async findUserByEmail(email: string): Promise<User | null> {
    return this.tracingService.withSpan(
      'users.findUserByEmail',
      async (span) => {
        span.setAttributes({
          'user.email': email,
          'user.operation': 'findByEmail',
        });

        try {
          const startTime = Date.now();

          const result = await this.tracedDatabaseService.query(
            'SELECT * FROM users WHERE email = $1',
            [email],
            {
              table: 'users',
              operation: 'select',
              includeParams: true,
              includeResult: true,
            },
          );

          const duration = Date.now() - startTime;
          const user = result[0] || null;

          span.setAttributes({
            'user.found': !!user,
            'user.operation.duration_ms': duration,
            'user.operation.success': true,
          });

          return user;
        } catch (error) {
          span.setAttributes({
            'user.operation.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          throw error;
        }
      },
      {
        'db.table': 'users',
        'db.operation': 'findByEmail',
      },
    );
  }

  /**
   * Update user with tracing
   */
  @TraceDatabase('update', 'users')
  async updateUser(id: string, dto: UpdateUserDto): Promise<User | null> {
    return this.tracingService.withSpan(
      'users.updateUser',
      async (span) => {
        span.setAttributes({
          'user.id': id,
          'user.operation': 'update',
        });

        try {
          const startTime = Date.now();

          // Build dynamic update query
          const updateFields: string[] = [];
          const updateValues: any[] = [];
          let paramIndex = 1;

          if (dto.firstName) {
            updateFields.push(`first_name = $${paramIndex++}`);
            updateValues.push(dto.firstName);
            span.setAttributes({ 'user.first_name': dto.firstName });
          }

          if (dto.lastName) {
            updateFields.push(`last_name = $${paramIndex++}`);
            updateValues.push(dto.lastName);
            span.setAttributes({ 'user.last_name': dto.lastName });
          }

          if (dto.email) {
            updateFields.push(`email = $${paramIndex++}`);
            updateValues.push(dto.email);
            span.setAttributes({ 'user.email': dto.email });
          }

          updateFields.push(`updated_at = NOW()`);
          updateValues.push(id);

          const query = `
            UPDATE users 
            SET ${updateFields.join(', ')} 
            WHERE id = $${paramIndex} 
            RETURNING *
          `;

          const result = await this.tracedDatabaseService.query(query, updateValues, {
            table: 'users',
            operation: 'update',
            includeParams: true,
            includeResult: true,
          });

          const duration = Date.now() - startTime;
          const user = result[0] || null;

          span.setAttributes({
            'user.updated': !!user,
            'user.operation.duration_ms': duration,
            'user.operation.success': true,
          });

          this.logger.log(`User updated: ${id}`, {
            updatedFields: Object.keys(dto),
          });

          return user;
        } catch (error) {
          span.setAttributes({
            'user.operation.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          this.logger.error('Failed to update user', {
            error: error.message,
            userId: id,
          });

          throw error;
        }
      },
      {
        'db.table': 'users',
        'db.operation': 'update',
      },
    );
  }

  /**
   * Delete user with tracing
   */
  @TraceDatabase('delete', 'users')
  async deleteUser(id: string): Promise<boolean> {
    return this.tracingService.withSpan(
      'users.deleteUser',
      async (span) => {
        span.setAttributes({
          'user.id': id,
          'user.operation': 'delete',
        });

        try {
          const startTime = Date.now();

          const result = await this.tracedDatabaseService.query(
            'DELETE FROM users WHERE id = $1',
            [id],
            {
              table: 'users',
              operation: 'delete',
              includeParams: true,
            },
          );

          const duration = Date.now() - startTime;
          const deleted = result.length > 0;

          span.setAttributes({
            'user.deleted': deleted,
            'user.operation.duration_ms': duration,
            'user.operation.success': true,
          });

          this.logger.log(`User deleted: ${id}`, {
            deleted,
          });

          return deleted;
        } catch (error) {
          span.setAttributes({
            'user.operation.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          this.logger.error('Failed to delete user', {
            error: error.message,
            userId: id,
          });

          throw error;
        }
      },
      {
        'db.table': 'users',
        'db.operation': 'delete',
      },
    );
  }

  /**
   * Get all users with pagination and tracing
   */
  @TraceDatabase('select', 'users')
  async findAllUsers(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ users: User[]; total: number }> {
    return this.tracingService.withSpan(
      'users.findAllUsers',
      async (span) => {
        span.setAttributes({
          'user.operation': 'findAll',
          'user.pagination.page': page,
          'user.pagination.limit': limit,
        });

        try {
          const startTime = Date.now();
          const offset = (page - 1) * limit;

          // Get total count
          const countResult = await this.tracedDatabaseService.query(
            'SELECT COUNT(*) as total FROM users',
            [],
            {
              table: 'users',
              operation: 'count',
            },
          );

          // Get paginated users
          const usersResult = await this.tracedDatabaseService.query(
            'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset],
            {
              table: 'users',
              operation: 'select',
              includeParams: true,
              includeResult: true,
            },
          );

          const duration = Date.now() - startTime;
          const total = parseInt(countResult[0].total);

          span.setAttributes({
            'user.total_count': total,
            'user.returned_count': usersResult.length,
            'user.operation.duration_ms': duration,
            'user.operation.success': true,
          });

          return {
            users: usersResult,
            total,
          };
        } catch (error) {
          span.setAttributes({
            'user.operation.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          throw error;
        }
      },
      {
        'db.table': 'users',
        'db.operation': 'findAll',
      },
    );
  }
}
