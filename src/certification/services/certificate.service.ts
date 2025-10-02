import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { type Certificate, CertificateStatus } from '../entities/certificate.entity';
import type { CertificationType } from '../entities/certification-type.entity';
import type { CreateCertificateDto } from '../dto/create-certificate.dto';
import type { CertificateGeneratorService } from './certificate-generator.service';
import type { CertificateVerificationService } from './certificate-verification.service';
import * as crypto from 'crypto';

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    private certificateRepository: Repository<Certificate>,
    private certificationTypeRepository: Repository<CertificationType>,
    private certificateGeneratorService: CertificateGeneratorService,
    private verificationService: CertificateVerificationService,
  ) {}

  async create(createDto: CreateCertificateDto): Promise<Certificate> {
    // Validate certification type
    const certificationType = await this.certificationTypeRepository.findOne({
      where: { id: createDto.certificationTypeId },
    });

    if (!certificationType) {
      throw new NotFoundException('Certification type not found');
    }

    // Check requirements
    await this.validateRequirements(createDto, certificationType);

    // Generate certificate number
    const certificateNumber = await this.generateCertificateNumber();

    // Create certificate
    const certificate = this.certificateRepository.create({
      ...createDto,
      certificateNumber,
      status: CertificateStatus.PENDING,
      verificationHash: this.generateVerificationHash(certificateNumber),
    });

    const saved = await this.certificateRepository.save(certificate);
    this.logger.log(`Certificate created: ${saved.id}`);

    // Generate certificate document
    await this.generateCertificateDocument(saved);

    return saved;
  }

  async findAll(userId?: string): Promise<Certificate[]> {
    const where = userId ? { userId } : {};

    return this.certificateRepository.find({
      where,
      relations: ['certificationType'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
      relations: ['certificationType', 'verifications'],
    });

    if (!certificate) {
      throw new NotFoundException(`Certificate with ID ${id} not found`);
    }

    return certificate;
  }

  async findByCertificateNumber(certificateNumber: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { certificateNumber },
      relations: ['certificationType'],
    });

    if (!certificate) {
      throw new NotFoundException(`Certificate with number ${certificateNumber} not found`);
    }

    return certificate;
  }

  async issueCertificate(id: string, issuedBy: string): Promise<Certificate> {
    const certificate = await this.findOne(id);

    if (certificate.status !== CertificateStatus.PENDING) {
      throw new BadRequestException('Certificate is not in pending status');
    }

    certificate.status = CertificateStatus.ISSUED;
    certificate.issuedAt = new Date();
    certificate.issuedBy = issuedBy;

    // Set expiration date if applicable
    if (certificate.certificationType.validityDays > 0) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + certificate.certificationType.validityDays);
      certificate.expiresAt = expirationDate;
    }

    const updated = await this.certificateRepository.save(certificate);
    this.logger.log(`Certificate issued: ${updated.id}`);

    return updated;
  }

  async revokeCertificate(id: string, reason: string): Promise<Certificate> {
    const certificate = await this.findOne(id);

    certificate.status = CertificateStatus.REVOKED;
    certificate.revocationReason = reason;

    const updated = await this.certificateRepository.save(certificate);
    this.logger.log(`Certificate revoked: ${updated.id}`);

    return updated;
  }

  async verifyCertificate(certificateNumber: string, verifierInfo: any): Promise<any> {
    const certificate = await this.findByCertificateNumber(certificateNumber);

    // Record verification attempt
    await this.verificationService.recordVerification(certificate.id, verifierInfo);

    // Check certificate validity
    const isValid = this.isCertificateValid(certificate);

    return {
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        recipientName: certificate.recipientName,
        certificationType: certificate.certificationType.name,
        issuedAt: certificate.issuedAt,
        expiresAt: certificate.expiresAt,
        status: certificate.status,
      },
      isValid,
      verificationTimestamp: new Date(),
    };
  }

  async getUserCertificates(userId: string): Promise<Certificate[]> {
    return this.certificateRepository.find({
      where: { userId, status: CertificateStatus.ISSUED },
      relations: ['certificationType'],
      order: { issuedAt: 'DESC' },
    });
  }

  async getCertificateStats(userId?: string) {
    const baseQuery = this.certificateRepository.createQueryBuilder('c');

    if (userId) {
      baseQuery.where('c.userId = :userId', { userId });
    }

    const [total, issued, pending, revoked, expired] = await Promise.all([
      baseQuery.getCount(),
      baseQuery
        .clone()
        .andWhere('c.status = :status', { status: CertificateStatus.ISSUED })
        .getCount(),
      baseQuery
        .clone()
        .andWhere('c.status = :status', { status: CertificateStatus.PENDING })
        .getCount(),
      baseQuery
        .clone()
        .andWhere('c.status = :status', { status: CertificateStatus.REVOKED })
        .getCount(),
      baseQuery
        .clone()
        .andWhere('c.status = :status', { status: CertificateStatus.EXPIRED })
        .getCount(),
    ]);

    return {
      total,
      issued,
      pending,
      revoked,
      expired,
    };
  }

  private async validateRequirements(
    createDto: CreateCertificateDto,
    certificationType: CertificationType,
  ): Promise<void> {
    const requirements = certificationType.requirements;

    if (!requirements) return;

    // Check minimum score
    if (requirements.minScore && createDto.score && createDto.score < requirements.minScore) {
      throw new BadRequestException(`Minimum score of ${requirements.minScore} required`);
    }

    // Check required courses (implement based on your course system)
    if (requirements.requiredCourses && requirements.requiredCourses.length > 0) {
      // Implement course completion check
    }

    // Check prerequisites
    if (requirements.prerequisites && requirements.prerequisites.length > 0) {
      // Implement prerequisite check
    }
  }

  private async generateCertificateNumber(): Promise<string> {
    const prefix = 'CERT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();

    return `${prefix}-${timestamp}-${random}`;
  }

  private generateVerificationHash(certificateNumber: string): string {
    return crypto
      .createHash('sha256')
      .update(certificateNumber + Date.now())
      .digest('hex');
  }

  private async generateCertificateDocument(certificate: Certificate): Promise<void> {
    try {
      const certificateUrl =
        await this.certificateGeneratorService.generateCertificate(certificate);
      certificate.certificateUrl = certificateUrl;
      await this.certificateRepository.save(certificate);
    } catch (error) {
      this.logger.error(`Failed to generate certificate document for ${certificate.id}:`, error);
    }
  }

  private isCertificateValid(certificate: Certificate): boolean {
    if (certificate.status !== CertificateStatus.ISSUED) {
      return false;
    }

    if (certificate.expiresAt && certificate.expiresAt < new Date()) {
      return false;
    }

    return true;
  }
}
