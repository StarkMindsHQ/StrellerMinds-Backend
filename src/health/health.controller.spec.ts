import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
    let controller: HealthController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
        }).compile();

        controller = module.get<HealthController>(HealthController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('check', () => {
        it('should return status ok', () => {
            const result = controller.check();
            expect(result.status).toBe('ok');
            expect(result.timestamp).toBeDefined();
        });

        it('should return a valid ISO timestamp', () => {
            const result = controller.check();
            expect(() => new Date(result.timestamp)).not.toThrow();
        });
    });

    describe('checkDatabase', () => {
        it('should return database status', () => {
            const result = controller.checkDatabase();
            expect(result.database).toBe('connected');
            expect(result.timestamp).toBeDefined();
        });

        it('should return a valid ISO timestamp', () => {
            const result = controller.checkDatabase();
            expect(() => new Date(result.timestamp)).not.toThrow();
        });
    });
}); 