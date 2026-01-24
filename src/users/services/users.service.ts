import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUsersDto } from '../dtos/create.users.dto';
import { updateUsersDto } from '../dtos/update.users.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  public async create(createUsersDto: CreateUsersDto, file?: any): Promise<User> {
    try {
      const existingUser = await this.userRepository.findOne({
        where: { email: createUsersDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      const user = this.userRepository.create(createUsersDto);
      return await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Error creating user');
    }
  }

  public async findAll(page: number = 1, limit: number = 10, where?: FindOptionsWhere<User>) {
    try {
      const [users, total] = await this.userRepository.findAndCount({
        where,
        skip: (page - 1) * limit,
        take: limit,
      });
      return { users, total };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error finding users: ${errorMessage}`);
      throw new InternalServerErrorException('Error fetching users');
    }
  }

  public async findOne(id: string, relations: string[] = []): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id }, relations });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  public async update(id: string, updateUserDto: updateUsersDto): Promise<User> {
    await this.findOne(id);
    await this.userRepository.update(id, updateUserDto);
    return await this.findOne(id);
  }

  public async delete(id: string): Promise<void> {
    const result = await this.userRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    // Cast to any because TypeORM update types can be strict with nulls in some configs
    await this.userRepository.update(userId, { refreshToken } as any);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    try {
      const user = await this.userRepository.findOne({
        where: { email },
        select: ['id', 'email', 'password', 'role', 'status'],
      });
      return user ?? undefined; // Fix: Converts null to undefined
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error finding user by email ${email}: ${errorMessage}`);
      throw new InternalServerErrorException('Error finding user by email');
    }
  }

  async findById(id: string): Promise<User | undefined> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        select: ['id', 'email', 'role', 'status'],
      });
      return user ?? undefined; // Fix: Converts null to undefined
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error finding user by ID ${id}: ${errorMessage}`);
      throw new InternalServerErrorException('Error finding user by ID');
    }
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userRepository.update(userId, { password: hashedPassword });
  }

  async requestAccountDeletion(id: string): Promise<void> {
    await this.delete(id);
  }
}