import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TaxAdvisor } from '../entities/tax-advisor.entity';
import { AdvisorPropertyAssignment } from '../entities/advisor-property-assignment.entity';
import { CreateTaxAdvisorDto } from '../dto/create-tax-advisor.dto';
import { UpdateTaxAdvisorDto } from '../dto/update-tax-advisor.dto';

@Injectable()
export class TaxAdvisorsService {
  constructor(
    @InjectRepository(TaxAdvisor)
    private readonly advisorRepository: Repository<TaxAdvisor>,
    @InjectRepository(AdvisorPropertyAssignment)
    private readonly assignmentRepository: Repository<AdvisorPropertyAssignment>,
  ) {}

  async create(dto: CreateTaxAdvisorDto): Promise<TaxAdvisor> {
    if (dto.licenseExpiresAt.getTime() <= Date.now()) {
      throw new ConflictException('License expiration must be in the future');
    }

    const advisor = this.advisorRepository.create({
      name: dto.name,
      email: dto.email,
      licenseNumber: dto.licenseNumber,
      licenseExpiresAt: dto.licenseExpiresAt,
      jurisdictions: this.normalizeJurisdictions(dto.jurisdictions),
      isActive: true,
    });

    return this.advisorRepository.save(advisor);
  }

  async findAll(jurisdiction?: string): Promise<TaxAdvisor[]> {
    const advisors = await this.advisorRepository.find({
      order: { createdAt: 'DESC' },
    });
    if (!jurisdiction) {
      return advisors;
    }
    const needle = jurisdiction.toUpperCase();
    return advisors.filter((a) => a.jurisdictions.includes(needle));
  }

  async findOne(id: string): Promise<TaxAdvisor> {
    const advisor = await this.advisorRepository.findOne({ where: { id } });
    if (!advisor) {
      throw new NotFoundException(`Tax advisor "${id}" not found`);
    }
    return advisor;
  }

  async update(id: string, dto: UpdateTaxAdvisorDto): Promise<TaxAdvisor> {
    const advisor = await this.findOne(id);

    if (dto.licenseExpiresAt && dto.licenseExpiresAt.getTime() <= Date.now()) {
      throw new ConflictException('License expiration must be in the future');
    }

    Object.assign(advisor, {
      ...dto,
      jurisdictions: dto.jurisdictions
        ? this.normalizeJurisdictions(dto.jurisdictions)
        : advisor.jurisdictions,
    });

    return this.advisorRepository.save(advisor);
  }

  async deactivate(id: string): Promise<TaxAdvisor> {
    const advisor = await this.findOne(id);
    advisor.isActive = false;
    return this.advisorRepository.save(advisor);
  }

  async assignToProperty(
    advisorId: string,
    propertyId: string,
  ): Promise<AdvisorPropertyAssignment> {
    const advisor = await this.findOne(advisorId);
    if (!advisor.isActive) {
      throw new ConflictException(`Advisor "${advisorId}" is not active`);
    }
    if (advisor.licenseExpiresAt.getTime() <= Date.now()) {
      throw new ConflictException(`Advisor "${advisorId}" license has expired`);
    }

    const existing = await this.assignmentRepository.findOne({
      where: { advisorId, propertyId, unassignedAt: IsNull() },
    });
    if (existing) {
      return existing;
    }

    const assignment = this.assignmentRepository.create({
      advisorId,
      propertyId,
      unassignedAt: null,
    });
    return this.assignmentRepository.save(assignment);
  }

  async unassignFromProperty(advisorId: string, propertyId: string): Promise<void> {
    const assignment = await this.assignmentRepository.findOne({
      where: { advisorId, propertyId, unassignedAt: IsNull() },
    });
    if (!assignment) {
      throw new NotFoundException(
        `No active assignment for advisor "${advisorId}" on property "${propertyId}"`,
      );
    }
    assignment.unassignedAt = new Date();
    await this.assignmentRepository.save(assignment);
  }

  async listAssignments(advisorId: string): Promise<AdvisorPropertyAssignment[]> {
    await this.findOne(advisorId);
    return this.assignmentRepository.find({
      where: { advisorId, unassignedAt: IsNull() },
      order: { assignedAt: 'DESC' },
    });
  }

  async findAdvisorsForProperty(propertyId: string): Promise<TaxAdvisor[]> {
    const assignments = await this.assignmentRepository.find({
      where: { propertyId, unassignedAt: IsNull() },
      relations: ['advisor'],
    });
    return assignments.map((a) => a.advisor);
  }

  private normalizeJurisdictions(values: string[]): string[] {
    return Array.from(new Set(values.map((v) => v.trim().toUpperCase()).filter(Boolean)));
  }
}
