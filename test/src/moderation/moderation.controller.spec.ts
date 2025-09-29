import { Test, TestingModule } from '@nestjs/testing';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { ModerationActionDto, EntityType } from './dto/create-moderation-action.dto';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';

describe('ModerationController', () => {
  let controller: ModerationController;
  let service: ModerationService;

  const mockLog = {
    id: 'log-id',
    action: 'approve',
    entityType: EntityType.POST,
    entityId: 'entity-id',
    moderator: { id: 'moderator-id' },
    createdAt: new Date(),
  };

  const mockService = {
    logModerationAction: jest.fn().mockResolvedValue(mockLog),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModerationController],
      providers: [
        {
          provide: ModerationService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = { id: 'moderator-id' };
          return true;
        },
      })
      .compile();

    controller = module.get<ModerationController>(ModerationController);
    service = module.get<ModerationService>(ModerationService);
  });

  it('should log moderation action with authenticated user', async () => {
    const dto: ModerationActionDto = {
      action: 'approve',
      entityType: EntityType.POST,
      entityId: 'entity-id',
    };

    const req = { user: { id: 'moderator-id' } } as any;
    const result = await controller.logModerationAction(dto, req);

    expect(service.logModerationAction).toHaveBeenCalledWith(
      dto.action,
      dto.entityType,
      dto.entityId,
      'moderator-id',
    );

    expect(result).toEqual(mockLog);
  });

  it('should throw if user is not in request', async () => {
    const dto: ModerationActionDto = {
      action: 'approve',
      entityType: EntityType.POST,
      entityId: 'entity-id',
    };

    await expect(controller.logModerationAction(dto, {} as any)).rejects.toThrow(
      'User not found in request',
    );
  });
});
