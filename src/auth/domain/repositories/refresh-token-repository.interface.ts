import { IRepository } from '../../../shared/domain/repositories/repository.interface';
import { RefreshToken } from '../entities/refresh-token.entity';

/**
 * RefreshToken Repository Interface
 * Extends the generic IRepository with RefreshToken-specific query methods
 */
export interface IRefreshTokenRepository extends IRepository<RefreshToken> {
  /**
   * Find a refresh token by its token string
   */
  findByToken(token: string): Promise<RefreshToken | null>;

  /**
   * Find all refresh tokens for a specific user
   */
  findByUserId(userId: string): Promise<RefreshToken[]>;

  /**
   * Delete all refresh tokens for a specific user
   */
  deleteByUserId(userId: string): Promise<number>;

  /**
   * Delete expired refresh tokens
   */
  deleteExpired(): Promise<number>;
}
