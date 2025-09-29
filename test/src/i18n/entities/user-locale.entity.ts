import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from "typeorm"

export enum LocaleSource {
  USER_PREFERENCE = "user_preference",
  BROWSER_DETECTION = "browser_detection",
  GEO_LOCATION = "geo_location",
  DEFAULT = "default",
}

@Entity("user_locales")
@Unique(["userId"])
@Index(["locale"])
@Index(["source"])
export class UserLocale {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  @Index()
  userId: string

  @Column()
  locale: string

  @Column({
    type: "enum",
    enum: LocaleSource,
    default: LocaleSource.USER_PREFERENCE,
  })
  source: LocaleSource

  @Column("simple-array", { nullable: true })
  fallbackLocales?: string[]

  @Column("jsonb", { nullable: true })
  preferences?: {
    dateFormat?: string
    timeFormat?: string
    numberFormat?: string
    currency?: string
    timezone?: string
    rtl?: boolean
  }

  @Column({ default: true })
  isActive: boolean

  @Column({ type: "timestamp", nullable: true })
  lastUsedAt?: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
