import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { User } from '../../domain/entities/user.entity';
import { UserPersistenceEntity } from '../persistence/user-persistence.entity';
import { UserMapper } from '../../application/mappers/user.mapper';
import { EncryptionService } from '../../../common/encryption.service';

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
    private readonly encryptionService: EncryptionService,
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
    const emailHash = this.encryptionService.hash(email.toLowerCase());
    const entity = await this.typeOrmRepository.findOne({ where: { emailHash } as any });
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
    // Note: ILike on encrypted fields (firstName, lastName, email) won't work.
    // For exact match on email, we can use emailHash.
    const emailHash = this.encryptionService.hash(searchTerm.toLowerCase());
    const entities = await this.typeOrmRepository.find({
      where: [
        { emailHash } as any,
        // Partial search on name is disabled for now due to encryption at rest.
        // Ideally, these should be indexed in ElasticSearch if partial search is required.
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
