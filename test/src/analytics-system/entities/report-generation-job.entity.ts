import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm"
import { User } from "../../users/entities/user.entity"

export enum ReportJobStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

@Entity("report_generation_jobs")
export class ReportGenerationJob {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  userId: string // User who requested the report

  @Column({ type: "varchar", length: 100 })
  reportType: string // e.g., "CoursePerformance", "UserEngagement"

  @Column({ type: "jsonb", nullable: true })
  parameters: Record<string, any> | null // Parameters used for report generation (e.g., date range, filters)

  @Column({ type: "enum", enum: ReportJobStatus, default: ReportJobStatus.PENDING })
  status: ReportJobStatus

  @Column({ type: "varchar", length: 255, nullable: true })
  filePath: string | null // Path or URL to the generated report file

  @Column({ type: "varchar", length: 255, nullable: true })
  errorMessage: string | null

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date

  @Column({ type: "timestamp", nullable: true })
  completedAt: Date | null

  @ManyToOne(
    () => User,
    (user) => user.reportJobs,
    { onDelete: "SET NULL" },
  )
  @JoinColumn({ name: "userId" })
  user: User
}
