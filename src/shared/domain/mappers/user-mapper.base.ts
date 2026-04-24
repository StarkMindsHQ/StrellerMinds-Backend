import { Injectable } from '@nestjs/common';
import { Mapper } from '../../application/mappers/mapper.base';
import { BaseUserEntity } from '../entities/user-entity.base';

/**
 * Shared User Response DTO used by both auth and user modules.
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
 * Shared base mapper for User entities.
 * Concrete mappers in each module only need to implement toPersistence/toDomain.
 */
@Injectable()
export abstract class BaseUserMapper<
  TDomain extends BaseUserEntity,
  TPersistence extends {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
> extends Mapper<TDomain, UserResponseDTO> {
  toDTO(entity: TDomain): UserResponseDTO {
    const p = entity.toPrimitives();
    return new UserResponseDTO(
      p.id,
      p.email,
      p.firstName,
      p.lastName,
      entity.getFullName(),
      p.isActive,
      p.createdAt,
      p.updatedAt,
    );
  }

  toPersistence(entity: TDomain): Partial<TPersistence> {
    const p = entity.toPrimitives();
    return {
      id: p.id,
      email: p.email,
      firstName: p.firstName,
      lastName: p.lastName,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    } as Partial<TPersistence>;
  }
}
