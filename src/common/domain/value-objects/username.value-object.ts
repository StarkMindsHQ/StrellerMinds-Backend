export class UserName {
  private constructor(private readonly value: string) {}

  static create(username: string): UserName {
    if (!this.isValid(username)) {
      throw new Error('Username must be 3-30 characters, alphanumeric with underscores and hyphens only');
    }
    return new UserName(username.toLowerCase().trim());
  }

  private static isValid(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    return usernameRegex.test(username);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: UserName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
