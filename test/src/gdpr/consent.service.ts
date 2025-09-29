import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserConsent,
  ConsentType,
  ConsentStatus,
} from './entities/user-consent.entity';
import { UpdateConsentDto, ConsentPreferencesDto } from './dto/consent.dto';

@Injectable()
export class ConsentService {
  constructor(
    @InjectRepository(UserConsent)
    private consentRepository: Repository<UserConsent>,
  ) {}

  async getUserConsents(userId: string): Promise<UserConsent[]> {
    return this.consentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateConsent(
    userId: string,
    consentDto: UpdateConsentDto,
  ): Promise<UserConsent> {
    const existingConsent = await this.consentRepository.findOne({
      where: { userId, consentType: consentDto.consentType },
    });

    if (existingConsent) {
      Object.assign(existingConsent, consentDto);
      return this.consentRepository.save(existingConsent);
    }

    const newConsent = this.consentRepository.create({
      userId,
      ...consentDto,
    });

    return this.consentRepository.save(newConsent);
  }

  async updateConsentPreferences(
    userId: string,
    preferences: ConsentPreferencesDto,
  ): Promise<UserConsent[]> {
    const results: UserConsent[] = [];

    for (const [type, status] of Object.entries(preferences)) {
      if (status) {
        const consent = await this.updateConsent(userId, {
          consentType: type as ConsentType,
          status,
          purpose: `User preference for ${type}`,
          legalBasis: 'consent',
        });
        results.push(consent);
      }
    }

    return results;
  }

  async withdrawAllConsents(userId: string): Promise<void> {
    await this.consentRepository.update(
      { userId },
      { status: ConsentStatus.WITHDRAWN, updatedAt: new Date() },
    );
  }

  async hasValidConsent(
    userId: string,
    consentType: ConsentType,
  ): Promise<boolean> {
    const consent = await this.consentRepository.findOne({
      where: { userId, consentType, status: ConsentStatus.GRANTED },
    });

    if (!consent) return false;

    if (consent.expiresAt && consent.expiresAt < new Date()) {
      await this.consentRepository.update(consent.id, {
        status: ConsentStatus.WITHDRAWN,
      });
      return false;
    }

    return true;
  }
}
