/* eslint-disable prettier/prettier */
// Purpose: Test file for auth controller.
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { Injectable } from '@nestjs/common';
import { JwtStrategy } from '@nestjs/passport'; 
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      // eslint-disable-next-line prettier/prettier
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue({ access_token: 'test-token' }),
            register: jest.fn().mockResolvedValue({ id: 'test-id' }),
          }
        },
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          }
        }
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

@Injectable()
export class JwtAuthStrategy extends JwtStrategy {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub };
  }
}
