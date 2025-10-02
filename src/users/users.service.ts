import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUsersDto } from './dtos/create.users.dto';
import { updateUsersDto } from './dtos/update.users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  public async create(createUsersDto: CreateUsersDto): Promise<User> {
    try {
      const existingUser = await this.userRepository.findOne({
        where: { email: createUsersDto.email },
        select: ['id', 'email'],
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

  public async findAll(
    page: number = 1,
    limit: number = 10,
    where?: FindOptionsWhere<User>,
  ): Promise<{ users: User[]; total: number }> {
    try {
      const [users, total] = await this.userRepository.findAndCount({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: ['id', 'firstName', 'lastName', 'email', 'role', 'status', 'createdAt'],
        order: { createdAt: 'DESC' },
      });
      return { users, total };
    } catch (error) {
      throw new InternalServerErrorException('Error fetching users');
    }
  }

  public async findOne(id: string, relations: string[] = []): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        relations,
        select: ['id', 'firstName', 'lastName', 'email', 'role', 'status', 'createdAt'],
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error fetching user');
    }
  }

  public async update(id: string, updateUserDto: updateUsersDto): Promise<User> {
    try {
      await this.findOne(id);
      await this.userRepository.update(id, updateUserDto);
      return await this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error updating user');
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const result = await this.userRepository.softDelete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error deleting user');
    }
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    try {
      await this.userRepository.update(userId, { refreshToken });
    } catch (error) {
      throw new InternalServerErrorException('Error updating refresh token');
    }
  }

  async findByEmail(email: string): Promise<User | undefined> {
    try {
      return this.userRepository.findOne({
        where: { email },
        select: ['id', 'email', 'password', 'role', 'status'],
      });
    } catch (error) {
      throw new InternalServerErrorException('Error finding user by email');
    }
  }

  async findById(id: string): Promise<User | undefined> {
    try {
      return this.userRepository.findOne({
        where: { id },
        select: ['id', 'email', 'role', 'status'],
      });
    } catch (error) {
      throw new InternalServerErrorException('Error finding user by ID');
    }
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    try {
      await this.userRepository.update(userId, { password: hashedPassword });
    } catch (error) {
      throw new InternalServerErrorException('Error updating password');
    }
  }
}
