import { Injectable } from '@nestjs/common';
import { BaseUserMapper, UserResponseDTO } from '../../../shared/domain/mappers/user-mapper.base';
import { User } from '../../domain/entities/user.entity';
import { UserPersistenceEntity } from '../../infrastructure/persistence/user-persistence.entity';

export { UserResponseDTO };

/**
 * User module UserMapper.
 * Inherits toPersistence and toDTO from BaseUserMapper.
 */
@Injectable()
export class UserMapper extends BaseUserMapper<User, UserPersistenceEntity> {
  toDomain(raw: UserPersistenceEntity): User {
    return User.create({
      id: raw.id,
      email: raw.email,
      firstName: raw.firstName,
      lastName: raw.lastName,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
