import { DomainEntity } from '../../../shared/domain/entities/domain-entity.base';

export interface RefreshTokenPrimitives {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * RefreshToken Domain Entity
 * Represents a refresh token in the domain layer
 */
export class RefreshToken extends DomainEntity<RefreshTokenPrimitives> {
  private readonly userId: string;
  private readonly token: string;
  private readonly expiresAt: Date;

  constructor(
    id: string,
    userId: string,
    token: string,
    expiresAt: Date,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.userId = userId;
    this.token = token;
    this.expiresAt = expiresAt;
  }

  getUserId(): string {
    return this.userId;
  }

  getToken(): string {
    return this.token;
  }

  getExpiresAt(): Date {
    return this.expiresAt;
  }

  /**
   * Check if this refresh token has expired
   */
  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  /**
   * Create a new RefreshToken from primitives
   */
  static create(primitives: RefreshTokenPrimitives): RefreshToken {
    return new RefreshToken(
      primitives.id,
      primitives.userId,
      primitives.token,
      primitives.expiresAt,
      primitives.createdAt,
      primitives.updatedAt,
    );
  }

  toPrimitives(): RefreshTokenPrimitives {
    return {
      id: this.id,
      userId: this.userId,
      token: this.token,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
