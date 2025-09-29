import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export enum PolicyType {
  DATA_RETENTION = "data_retention",
  DATA_ACCESS = "data_access",
  DATA_CLASSIFICATION = "data_classification",
  DATA_PRIVACY = "data_privacy",
  DATA_QUALITY = "data_quality",
  DATA_LINEAGE = "data_lineage",
}

export enum PolicyStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  DRAFT = "draft",
  UNDER_REVIEW = "under_review",
}

@Entity("data_governance_policies")
@Index(["policyType", "status"])
@Index(["entityType", "status"])
export class DataGovernancePolicy {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  name: string

  @Column("text")
  description: string

  @Column({
    type: "enum",
    enum: PolicyType,
  })
  policyType: PolicyType

  @Column({
    type: "enum",
    enum: PolicyStatus,
    default: PolicyStatus.DRAFT,
  })
  status: PolicyStatus

  @Column()
  entityType: string

  @Column("jsonb")
  rules: Record<string, any>

  @Column("jsonb", { nullable: true })
  enforcement?: Record<string, any>

  @Column("jsonb", { nullable: true })
  exceptions?: Record<string, any>

  @Column({ nullable: true })
  owner?: string

  @Column("simple-array", { nullable: true })
  stakeholders?: string[]

  @Column({ type: "date", nullable: true })
  effectiveDate?: Date

  @Column({ type: "date", nullable: true })
  expirationDate?: Date

  @Column({ type: "date", nullable: true })
  reviewDate?: Date

  @Column({ nullable: true })
  createdBy?: string

  @Column({ nullable: true })
  updatedBy?: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
