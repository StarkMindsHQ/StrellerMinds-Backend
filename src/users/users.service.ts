import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUsersDto } from './dtos/create.users.dto';
import { updateUsersDto } from './dtos/update.users.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly userRepository: Repository<User>) {}

  public async create(createUsersDto: CreateUsersDto, file?: any): Promise<User> {
    const existingUser = await this.userRepository.findOne({ where: { email: createUsersDto.email } });
    if (existingUser) throw new ConflictException('Email already exists');
    const user = this.userRepository.create(createUsersDto);
    return await this.userRepository.save(user);
  }

  public async findAll(page: number = 1, limit: number = 10, where?: FindOptionsWhere<User>) {
    const [users, total] = await this.userRepository.findAndCount({ where, skip: (page - 1) * limit, take: limit });
    return { users, total };
  }

  public async findOne(id: string, relations: string[] = []) {
    const user = await this.userRepository.findOne({ where: { id }, relations });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  public async update(id: string, updateUserDto: updateUsersDto) {
    await this.findOne(id);
    await this.userRepository.update(id, updateUserDto);
    return await this.findOne(id);
  }

  public async delete(id: string) {
    await this.userRepository.softDelete(id);
  }

  async updateRefreshToken(userId: string, refreshToken: string | null) {
    await this.userRepository.update(userId, { refreshToken });
  }

  async findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }

  async updatePassword(userId: string, hashedPassword: string) {
    await this.userRepository.update(userId, { password: hashedPassword });
  }

  async requestAccountDeletion(id: string) {
    return this.delete(id);
  }
}