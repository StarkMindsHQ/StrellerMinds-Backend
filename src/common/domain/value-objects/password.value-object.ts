import * as bcrypt from 'bcrypt';

export class Password {
  private constructor(private readonly hashedValue: string) {}

  static async create(plainPassword: string): Promise<Password> {
    if (!this.isValid(plainPassword)) {
      throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
    }
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    return new Password(hashedPassword);
  }

  static fromHashed(hashedPassword: string): Password {
    if (!hashedPassword) {
      throw new Error('Hashed password is required');
    }
    return new Password(hashedPassword);
  }

  private static isValid(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChar;
  }

  async verify(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.hashedValue);
  }

  getHashedValue(): string {
    return this.hashedValue;
  }
}
