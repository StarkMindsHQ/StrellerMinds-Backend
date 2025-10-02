import { Injectable, Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { CertificateVerification } from '../entities/certificate-verification.entity';

@Injectable()
export class CertificateVerificationService {
  private readonly logger = new Logger(CertificateVerificationService.name);

  constructor(private verificationRepository: Repository<CertificateVerification>) {}

  async recordVerification(
    certificateId: string,
    verifierInfo: any,
  ): Promise<CertificateVerification> {
    const verification = this.verificationRepository.create({
      certificateId,
      verifierInfo,
      verificationDetails: {
        method: verifierInfo.method || 'certificate_number',
        timestamp: new Date(),
        additionalData: verifierInfo.additionalData,
      },
    });

    const saved = await this.verificationRepository.save(verification);
    this.logger.log(`Certificate verification recorded: ${saved.id}`);

    return saved;
  }

  async getVerificationHistory(certificateId: string): Promise<CertificateVerification[]> {
    return this.verificationRepository.find({
      where: { certificateId },
      order: { createdAt: 'DESC' },
    });
  }

  async getVerificationStats(certificateId: string) {
    const [total, recent] = await Promise.all([
      this.verificationRepository.count({ where: { certificateId } }),
      this.verificationRepository.count({
        where: {
          certificateId,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      }),
    ]);

    return {
      totalVerifications: total,
      recentVerifications: recent,
    };
  }
}
