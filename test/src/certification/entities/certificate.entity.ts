import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from "typeorm"
import { CertificationType } from "./certification-type.entity"
import { CertificateVerification } from "./certificate-verification.entity"

export enum CertificateStatus {
  PENDING = "pending",
  ISSUED = "issued",
  REVOKED = "revoked",
  EXPIRED = "expired",
  SUSPENDED = "suspended",
}

@Entity("certificates")
@Index(["userId"])
@Index(["certificateNumber"], { unique: true })
@Index(["status"])
export class Certificate {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "uuid" })
  certificationTypeId: string

  @ManyToOne(
    () => CertificationType,
    (type) => type.certificates,
  )
  @JoinColumn({ name: "certificationTypeId" })
  certificationType: CertificationType

  @Column({ unique: true, length: 50 })
  certificateNumber: string

  @Column({ length: 255 })
  recipientName: string

  @Column({ length: 255 })
  recipientEmail: string

  @Column({
    type: "enum",
    enum: CertificateStatus,
    default: CertificateStatus.PENDING,
  })
  status: CertificateStatus

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  score: number

  @Column({ type: "json", nullable: true })
  metadata: {
    courseId?: string
    courseName?: string
    instructorName?: string
    completionDate?: Date
    assessmentResults?: any[]
    skillsValidated?: string[]
    additionalInfo?: Record<string, any>
  }

  @Column({ type: "text", nullable: true })
  certificateUrl: string // URL to generated certificate PDF/image

  @Column({ type: "text", nullable: true })
  verificationHash: string // For blockchain or cryptographic verification

  @Column({ type: "timestamp", nullable: true })
  issuedAt: Date

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date

  @Column({ type: "uuid", nullable: true })
  issuedBy: string // User ID of issuer

  @Column({ type: "text", nullable: true })
  revocationReason: string

  @OneToMany(
    () => CertificateVerification,
    (verification) => verification.certificate,
  )
  verifications: CertificateVerification[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
