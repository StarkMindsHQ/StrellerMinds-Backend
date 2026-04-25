import { BaseUserEntity, UserPrimitives } from '../../../shared/domain/entities/user-entity.base';

export { UserPrimitives };

/**
 * Auth module User domain entity.
 * Extends shared BaseUserEntity to avoid duplication with user module.
 */
export class User extends BaseUserEntity {
  static create(primitives: UserPrimitives): User {
    return new User(
      primitives.id,
      primitives.email,
      primitives.firstName,
      primitives.lastName,
      primitives.isActive,
      primitives.createdAt,
      primitives.updatedAt,
    );
  }
}
