import { Injectable } from '@nestjs/common';
import { Mapper } from '../../../shared/application/mappers/mapper.base';
import { User } from '../../domain/entities/user.entity';
import { UserPersistenceEntity } from '../../infrastructure/persistence/user-persistence.entity';

/**
 * User Response DTO
 */
export class UserResponseDTO {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly firstName: string | null,
    public readonly lastName: string | null,
    public readonly fullName: string,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

/**
 * User Mapper
 * Handles conversion between domain entity, persistence entity, and DTO
 */
@Injectable()
export class UserMapper extends Mapper<User, UserResponseDTO> {
  toPersistence(entity: User): Partial<UserPersistenceEntity> {
    const primitives = entity.toPrimitives();
    return {
      id: primitives.id,
      email: primitives.email,
      firstName: primitives.firstName,
      lastName: primitives.lastName,
      isActive: primitives.isActive,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }

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

  toDTO(entity: User): UserResponseDTO {
    const primitives = entity.toPrimitives();
    return new UserResponseDTO(
      primitives.id,
      primitives.email,
      primitives.firstName,
      primitives.lastName,
      entity.getFullName(),
      primitives.isActive,
      primitives.createdAt,
      primitives.updatedAt,
    );
  }
}
