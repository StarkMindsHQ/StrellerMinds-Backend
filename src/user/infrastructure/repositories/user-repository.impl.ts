import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { User } from '../../domain/entities/user.entity';
import { UserPersistenceEntity } from '../persistence/user-persistence.entity';
import { UserMapper } from '../../application/mappers/user.mapper';

/**
 * User Repository Implementation (for User Module)
 * Implements the IUserRepository interface using TypeORM
 * Handles all database operations for User entities in the user module context
 */
@Injectable()
export class UserRepositoryImpl implements IUserRepository {
  constructor(
    @InjectRepository(UserPersistenceEntity)
    private readonly typeOrmRepository: Repository<UserPersistenceEntity>,
    private readonly userMapper: UserMapper,
  ) {}

  async save(entity: User): Promise<User> {
    const persistenceEntity = this.userMapper.toPersistence(entity);
    const savedEntity = await this.typeOrmRepository.save(persistenceEntity);
    return this.userMapper.toDomain(savedEntity);
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.typeOrmRepository.findOne({ where: { id } });
    if (!entity) {
      return null;
    }
    return this.userMapper.toDomain(entity);
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.typeOrmRepository.findOne({ where: { email } });
    if (!entity) {
      return null;
    }
    return this.userMapper.toDomain(entity);
  }

  async findAll(): Promise<User[]> {
    const entities = await this.typeOrmRepository.find();
    return entities.map((entity) => this.userMapper.toDomain(entity));
  }

  async findBySearchTerm(searchTerm: string): Promise<User[]> {
    const entities = await this.typeOrmRepository.find({
      where: [
        { firstName: ILike(`%${searchTerm}%`) },
        { lastName: ILike(`%${searchTerm}%`) },
        { email: ILike(`%${searchTerm}%`) },
      ],
    });
    return entities.map((entity) => this.userMapper.toDomain(entity));
  }

  async findAllActive(): Promise<User[]> {
    const entities = await this.typeOrmRepository.find({ where: { isActive: true } });
    return entities.map((entity) => this.userMapper.toDomain(entity));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.typeOrmRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.typeOrmRepository.count({ where: { id } });
    return count > 0;
  }
}
