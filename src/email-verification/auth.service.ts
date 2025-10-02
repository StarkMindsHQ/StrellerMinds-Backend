import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailVerificationService } from './email-verification.service';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { User } from './entities/user.entity';
import { LoginDto } from 'src/auth/dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private emailVerificationService: EmailVerificationService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string; user: Partial<User> }> {
    const { email, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      isEmailVerified: false,
    });

    const savedUser = await this.userRepository.save(user);

    // Send verification email
    await this.emailVerificationService.sendVerificationEmail(email);

    return {
      message: 'User registered successfully. Please check your email for verification.',
      user: {
        id: savedUser.id,
        email: savedUser.email,
        isEmailVerified: savedUser.isEmailVerified,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string; user: Partial<User> }> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Optional: Require email verification before login
    // if (!user.isEmailVerified) {
    //   throw new UnauthorizedException('Please verify your email before logging in');
    // }

    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }
}
