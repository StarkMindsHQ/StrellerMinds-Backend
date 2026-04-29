import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUserRepository, PaginatedResult } from '../../domain/repositories/user-repository.interface';
import { User } from '../../domain/entities/user.entity';
import { UserPersistenceEntity } from '../persistence/user-persistence.entity';
import { UserMapper } from '../../application/mappers/user.mapper';
import { EncryptionService } from '../../../common/encryption.service';

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
    return entity ? this.userMapper.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const emailHash = this.encryptionService.hash(email.toLowerCase());
    const entity = await this.typeOrmRepository.findOne({ where: { emailHash } as any });
    return entity ? this.userMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<User[]> {
    const entities = await this.typeOrmRepository.find({ take: 1000 });
    return entities.map((e) => this.userMapper.toDomain(e));
  }

  async findPaginated(limit: number, afterId?: string): Promise<PaginatedResult<User>> {
    const qb = this.typeOrmRepository
      .createQueryBuilder('user')
      .orderBy('user.id', 'ASC')
      .take(limit + 1);

    if (afterId) {
      qb.where('user.id > :afterId', { afterId });
    }

    const entities = await qb.getMany();
    const hasMore = entities.length > limit;
    const items = entities.slice(0, limit).map((e) => this.userMapper.toDomain(e));
    return { items, hasMore };
  }

  async findBySearchTerm(searchTerm: string, limit: number, afterId?: string): Promise<PaginatedResult<User>> {
    // Partial search on encrypted fields isn't possible; match on emailHash only.
    const emailHash = this.encryptionService.hash(searchTerm.toLowerCase());
    const qb = this.typeOrmRepository
      .createQueryBuilder('user')
      .where('user.emailHash = :emailHash', { emailHash })
      .orderBy('user.id', 'ASC')
      .take(limit + 1);

    if (afterId) {
      qb.andWhere('user.id > :afterId', { afterId });
    }

    const entities = await qb.getMany();
    const hasMore = entities.length > limit;
    const items = entities.slice(0, limit).map((e) => this.userMapper.toDomain(e));
    return { items, hasMore };
  }

  async findAllActive(): Promise<User[]> {
    const entities = await this.typeOrmRepository.find({ where: { isActive: true } });
    return entities.map((e) => this.userMapper.toDomain(e));
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
