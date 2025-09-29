import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from "typeorm"

export enum TranslationStatus {
  DRAFT = "draft",
  PENDING_REVIEW = "pending_review",
  APPROVED = "approved",
  PUBLISHED = "published",
  DEPRECATED = "deprecated",
}

export enum TranslationSource {
  MANUAL = "manual",
  TMS = "tms",
  AUTO_TRANSLATE = "auto_translate",
  IMPORT = "import",
}

@Entity("translations")
@Unique(["key", "locale", "namespace"])
@Index(["locale", "namespace"])
@Index(["key", "locale"])
@Index(["status", "locale"])
export class Translation {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  key: string

  @Column()
  @Index()
  locale: string

  @Column()
  @Index()
  namespace: string

  @Column("text")
  value: string

  @Column("text", { nullable: true })
  description?: string

  @Column("text", { nullable: true })
  context?: string

  @Column({
    type: "enum",
    enum: TranslationStatus,
    default: TranslationStatus.DRAFT,
  })
  status: TranslationStatus

  @Column({
    type: "enum",
    enum: TranslationSource,
    default: TranslationSource.MANUAL,
  })
  source: TranslationSource

  @Column("jsonb", { nullable: true })
  metadata?: {
    pluralForms?: Record<string, string>
    variables?: string[]
    maxLength?: number
    tags?: string[]
    translatorNotes?: string
    reviewNotes?: string
  }

  @Column({ nullable: true })
  translatedBy?: string

  @Column({ nullable: true })
  reviewedBy?: string

  @Column({ type: "timestamp", nullable: true })
  translatedAt?: Date

  @Column({ type: "timestamp", nullable: true })
  reviewedAt?: Date

  @Column({ type: "timestamp", nullable: true })
  publishedAt?: Date

  @Column({ default: 1 })
  version: number

  @Column({ nullable: true })
  parentId?: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
