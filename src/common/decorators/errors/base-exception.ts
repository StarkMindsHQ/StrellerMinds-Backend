export abstract class BaseException extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    public readonly message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}
