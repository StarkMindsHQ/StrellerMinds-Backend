import { HttpException, InternalServerErrorException } from '@nestjs/common';
import { TokenBlacklistMiddleware } from './auth.middleware';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';

describe('TokenBlacklistMiddleware', () => {
  let middleware: TokenBlacklistMiddleware;
  let repo: jest.Mocked<Repository<RefreshToken>>;
  let next: jest.Mock;

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
    } as any;

    middleware = new TokenBlacklistMiddleware(repo as any);
    next = jest.fn();
  });

  it('should call next when there is no Authorization header', async () => {
    const req: any = { headers: {} };
    const res: any = {};

    await middleware.use(req, res, next);

    expect(repo.findOne).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should call next when Authorization header is not Bearer', async () => {
    const req: any = { headers: { authorization: 'Basic abc123' } };
    const res: any = {};

    await middleware.use(req, res, next);

    expect(repo.findOne).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should call next when token is not blacklisted', async () => {
    const req: any = { headers: { authorization: 'Bearer valid-token' } };
    const res: any = {};

    repo.findOne.mockResolvedValue(null);

    await middleware.use(req, res, next);

    expect(repo.findOne).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should throw HttpException when token is blacklisted', async () => {
    const req: any = { headers: { authorization: 'Bearer revoked-token' } };
    const res: any = {};

    repo.findOne.mockResolvedValue({ isRevoked: true } as RefreshToken);

    await expect(middleware.use(req, res, next)).rejects.toBeInstanceOf(HttpException);
    expect(next).not.toHaveBeenCalled();
  });

  it('should wrap unexpected errors in InternalServerErrorException', async () => {
    const req: any = { headers: { authorization: 'Bearer any-token' } };
    const res: any = {};

    repo.findOne.mockRejectedValue(new Error('DB failure'));

    await expect(middleware.use(req, res, next)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    expect(next).not.toHaveBeenCalled();
  });
});
