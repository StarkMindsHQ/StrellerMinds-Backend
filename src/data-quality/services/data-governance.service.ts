import { Injectable, Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import { type DataGovernancePolicy, PolicyStatus } from '../entities/data-governance-policy.entity';
import type { DataLineage } from '../entities/data-lineage.entity';

export interface GovernanceReport {
  policyCompliance: {
    total: number;
    compliant: number;
    nonCompliant: number;
    rate: number;
  };
  dataLineage: {
    entities: number;
    relationships: number;
    orphaned: number;
  };
  recommendations: string[];
}

@Injectable()
export class DataGovernanceService {
  private readonly logger = new Logger(DataGovernanceService.name);

  constructor(
    private readonly policyRepository: Repository<DataGovernancePolicy>,
    private readonly lineageRepository: Repository<DataLineage>,
  ) {}

  async createPolicy(policyData: Partial<DataGovernancePolicy>): Promise<DataGovernancePolicy> {
    const policy = this.policyRepository.create(policyData);
    return this.policyRepository.save(policy);
  }

  async updatePolicy(
    id: string,
    updates: Partial<DataGovernancePolicy>,
  ): Promise<DataGovernancePolicy> {
    await this.policyRepository.update(id, updates);
    const policy = await this.policyRepository.findOne({ where: { id } });
    if (!policy) {
      throw new Error(`Policy with id ${id} not found`);
    }
    return policy;
  }

  async activatePolicy(id: string): Promise<void> {
    await this.policyRepository.update(id, {
      status: PolicyStatus.ACTIVE,
      effectiveDate: new Date(),
    });
  }

  async deactivatePolicy(id: string): Promise<void> {
    await this.policyRepository.update(id, { status: PolicyStatus.INACTIVE });
  }

  async getPolicies(filters: {
    policyType?: string;
    status?: PolicyStatus;
    entityType?: string;
  }): Promise<DataGovernancePolicy[]> {
    const query = this.policyRepository.createQueryBuilder('policy');

    if (filters.policyType) {
      query.andWhere('policy.policyType = :policyType', { policyType: filters.policyType });
    }

    if (filters.status) {
      query.andWhere('policy.status = :status', { status: filters.status });
    }

    if (filters.entityType) {
      query.andWhere('policy.entityType = :entityType', { entityType: filters.entityType });
    }

    return query.orderBy('policy.createdAt', 'DESC').getMany();
  }

  async checkPolicyCompliance(
    entityType: string,
    data: any[],
  ): Promise<{
    compliant: boolean;
    violations: Array<{
      policyId: string;
      policyName: string;
      violation: string;
      severity: string;
    }>;
  }> {
    const policies = await this.getPolicies({
      entityType,
      status: PolicyStatus.ACTIVE,
    });

    const violations: Array<{
      policyId: string;
      policyName: string;
      violation: string;
      severity: string;
    }> = [];

    for (const policy of policies) {
      const policyViolations = await this.validatePolicy(policy, data);
      violations.push(...policyViolations);
    }

    return {
      compliant: violations.length === 0,
      violations,
    };
  }

  private async validatePolicy(
    policy: DataGovernancePolicy,
    data: any[],
  ): Promise<
    Array<{
      policyId: string;
      policyName: string;
      violation: string;
      severity: string;
    }>
  > {
    const violations: Array<{
      policyId: string;
      policyName: string;
      violation: string;
      severity: string;
    }> = [];

    switch (policy.policyType) {
      case 'data_retention':
        const retentionViolations = this.checkRetentionPolicy(policy, data);
        violations.push(
          ...retentionViolations.map((v) => ({
            policyId: policy.id,
            policyName: policy.name,
            violation: v,
            severity: 'medium',
          })),
        );
        break;

      case 'data_access':
        const accessViolations = this.checkAccessPolicy(policy, data);
        violations.push(
          ...accessViolations.map((v) => ({
            policyId: policy.id,
            policyName: policy.name,
            violation: v,
            severity: 'high',
          })),
        );
        break;

      case 'data_classification':
        const classificationViolations = this.checkClassificationPolicy(policy, data);
        violations.push(
          ...classificationViolations.map((v) => ({
            policyId: policy.id,
            policyName: policy.name,
            violation: v,
            severity: 'medium',
          })),
        );
        break;

      case 'data_privacy':
        const privacyViolations = this.checkPrivacyPolicy(policy, data);
        violations.push(
          ...privacyViolations.map((v) => ({
            policyId: policy.id,
            policyName: policy.name,
            violation: v,
            severity: 'critical',
          })),
        );
        break;
    }

    return violations;
  }

  private checkRetentionPolicy(policy: DataGovernancePolicy, data: any[]): string[] {
    const violations: string[] = [];
    const retentionDays = policy.rules.retentionDays;
    const dateField = policy.rules.dateField || 'createdAt';

    if (retentionDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const expiredRecords = data.filter((item) => {
        const recordDate = new Date(item[dateField]);
        return recordDate < cutoffDate;
      });

      if (expiredRecords.length > 0) {
        violations.push(
          `${expiredRecords.length} records exceed retention period of ${retentionDays} days`,
        );
      }
    }

    return violations;
  }

  private checkAccessPolicy(policy: DataGovernancePolicy, data: any[]): string[] {
    const violations: string[] = [];
    const allowedRoles = policy.rules.allowedRoles || [];
    const sensitiveFields = policy.rules.sensitiveFields || [];

    // This would typically check against actual access logs
    // For now, we'll check if sensitive fields are properly protected
    for (const item of data) {
      for (const field of sensitiveFields) {
        if (item[field] && !item[`${field}_encrypted`]) {
          violations.push(`Sensitive field ${field} is not encrypted`);
          break;
        }
      }
    }

    return violations;
  }

  private checkClassificationPolicy(policy: DataGovernancePolicy, data: any[]): string[] {
    const violations: string[] = [];
    const requiredClassification = policy.rules.requiredClassification;
    const classificationField = policy.rules.classificationField || 'dataClassification';

    if (requiredClassification) {
      const unclassifiedRecords = data.filter(
        (item) =>
          !item[classificationField] || !requiredClassification.includes(item[classificationField]),
      );

      if (unclassifiedRecords.length > 0) {
        violations.push(`${unclassifiedRecords.length} records lack proper data classification`);
      }
    }

    return violations;
  }

  private checkPrivacyPolicy(policy: DataGovernancePolicy, data: any[]): string[] {
    const violations: string[] = [];
    const piiFields = policy.rules.piiFields || [];
    const consentRequired = policy.rules.consentRequired || false;

    for (const item of data) {
      // Check for PII without proper handling
      for (const field of piiFields) {
        if (item[field] && !item[`${field}_anonymized`] && !item[`${field}_encrypted`]) {
          violations.push(`PII field ${field} is not properly protected`);
          break;
        }
      }

      // Check for consent
      if (consentRequired && !item.consentGiven) {
        violations.push('Record processed without required consent');
        break;
      }
    }

    return violations;
  }

  async recordLineage(lineageData: Partial<DataLineage>): Promise<DataLineage> {
    const lineage = this.lineageRepository.create(lineageData);
    return this.lineageRepository.save(lineage);
  }

  async getLineage(entityName: string): Promise<{
    upstream: DataLineage[];
    downstream: DataLineage[];
  }> {
    const upstream = await this.lineageRepository.find({
      where: { targetEntity: entityName, isActive: true },
      order: { createdAt: 'DESC' },
    });

    const downstream = await this.lineageRepository.find({
      where: { sourceEntity: entityName, isActive: true },
      order: { createdAt: 'DESC' },
    });

    return { upstream, downstream };
  }

  async generateGovernanceReport(): Promise<GovernanceReport> {
    const totalPolicies = await this.policyRepository.count();
    const activePolicies = await this.policyRepository.count({
      where: { status: PolicyStatus.ACTIVE },
    });

    const totalLineage = await this.lineageRepository.count({ where: { isActive: true } });
    const uniqueEntities = await this.lineageRepository
      .createQueryBuilder('lineage')
      .select('DISTINCT lineage.sourceEntity')
      .addSelect('DISTINCT lineage.targetEntity')
      .where('lineage.isActive = :isActive', { isActive: true })
      .getRawMany();

    const recommendations: string[] = [];

    if (activePolicies < totalPolicies * 0.8) {
      recommendations.push('Consider activating more governance policies');
    }

    if (totalLineage < uniqueEntities.length * 2) {
      recommendations.push('Improve data lineage documentation');
    }

    return {
      policyCompliance: {
        total: totalPolicies,
        compliant: activePolicies,
        nonCompliant: totalPolicies - activePolicies,
        rate: totalPolicies > 0 ? (activePolicies / totalPolicies) * 100 : 100,
      },
      dataLineage: {
        entities: uniqueEntities.length,
        relationships: totalLineage,
        orphaned: 0, // Would need more complex query
      },
      recommendations,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async reviewPolicies(): Promise<void> {
    this.logger.log('Starting daily policy review');

    const policies = await this.policyRepository.find({
      where: { status: PolicyStatus.ACTIVE },
    });

    for (const policy of policies) {
      // Check if policy needs review
      if (policy.reviewDate && policy.reviewDate <= new Date()) {
        this.logger.log(`Policy ${policy.name} is due for review`);
        // Could send notifications or create tasks here
      }

      // Check if policy has expired
      if (policy.expirationDate && policy.expirationDate <= new Date()) {
        await this.policyRepository.update(policy.id, {
          status: PolicyStatus.INACTIVE,
        });
        this.logger.log(`Policy ${policy.name} has been deactivated due to expiration`);
      }
    }
  }
}
