import { Test, TestingModule } from '@nestjs/testing';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

describe('EmailController', () => {
  let controller: EmailController;
  let mockService: Partial<EmailService>;

  beforeEach(async () => {
    mockService = {
      sendVerificationEmail: jest.fn(),
      updateEmailPreference: jest.fn(),
      getUserPreferences: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [{ provide: EmailService, useValue: mockService }],
    }).compile();

    controller = module.get<EmailController>(EmailController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should send verification email', async () => {
    const mockUser = { email: 'user@example.com', name: 'User' };
    (mockService.sendVerificationEmail as jest.Mock).mockResolvedValue(true);

    const result = await controller.sendVerification({
      user: mockUser,
      code: '1234',
      token: 'token123',
    });

    expect(result).toBe(true);
    expect(mockService.sendVerificationEmail).toHaveBeenCalledWith(mockUser, '1234', 'token123');
  });

  it('should update email preference', async () => {
    const dto = { email: 'user@example.com', type: 'email-verification', optOut: true };
    await controller.updatePreference(dto);
    expect(mockService.updateEmailPreference).toHaveBeenCalledWith(
      'user@example.com',
      'email-verification',
      true,
    );
  });

  it('should get user preferences', async () => {
    const email = 'user@example.com';
    await controller.getPreferences(email);
    expect(mockService.getUserPreferences).toHaveBeenCalledWith(email);
  });
});
