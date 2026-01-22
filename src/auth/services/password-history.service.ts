import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordHistory } from '../entities/password-history.entity';
import { BcryptService } from './bcrypt.service';

@Injectable()
export class PasswordHistoryService {
    constructor(
        @InjectRepository(PasswordHistory)
        private readonly passwordHistoryRepository: Repository<PasswordHistory>,
        private readonly bcryptService: BcryptService,
    ) { }

    async addPasswordToHistory(userId: string, passwordHash: string): Promise<void> {
        const history = this.passwordHistoryRepository.create({
            userId,
            password: passwordHash,
        });
        await this.passwordHistoryRepository.save(history);
    }

    async isPasswordInHistory(userId: string, newPassword: string, limit: number = 5): Promise<boolean> {
        const history = await this.passwordHistoryRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
        });

        for (const record of history) {
            const isMatch = await this.bcryptService.compare(newPassword, record.password);
            if (isMatch) {
                return true;
            }
        }

        return false;
    }
}
