import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export enum LocaleStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  BETA = "beta",
  DEPRECATED = "deprecated",
}

@Entity("locale_metadata")
@Index(["code"])
@Index(["status"])
export class LocaleMetadata {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ unique: true })
  code: string

  @Column()
  name: string

  @Column()
  nativeName: string

  @Column()
  englishName: string

  @Column({ length: 2 })
  languageCode: string

  @Column({ length: 2, nullable: true })
  countryCode?: string

  @Column({
    type: "enum",
    enum: LocaleStatus,
    default: LocaleStatus.ACTIVE,
  })
  status: LocaleStatus

  @Column({ default: false })
  isRtl: boolean

  @Column("jsonb")
  formatting: {
    dateFormat: string
    timeFormat: string
    numberFormat: {
      decimal: string
      thousands: string
      currency: string
    }
    pluralRules: string[]
  }

  @Column("simple-array", { nullable: true })
  fallbackLocales?: string[]

  @Column({ default: 0 })
  completionPercentage: number

  @Column({ default: 0 })
  priority: number

  @Column("jsonb", { nullable: true })
  metadata?: {
    translators?: string[]
    reviewers?: string[]
    lastSyncAt?: string
    tmsProjectId?: string
    notes?: string
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
