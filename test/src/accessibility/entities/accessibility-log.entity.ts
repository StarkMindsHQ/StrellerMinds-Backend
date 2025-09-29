import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm"

export enum AccessibilityEventType {
  VIOLATION = "violation",
  WARNING = "warning",
  ERROR = "error",
  FEEDBACK = "feedback",
  AUDIT = "audit",
  COMPLIANCE_CHECK = "compliance_check",
  USER_REPORT = "user_report",
  AUTOMATED_SCAN = "automated_scan",
}

export enum SeverityLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum WcagLevel {
  A = "A",
  AA = "AA",
  AAA = "AAA",
}

@Entity("accessibility_logs")
@Index(["event_type", "created_at"])
@Index(["severity_level", "created_at"])
@Index(["user_id", "created_at"])
export class AccessibilityLog {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({
    type: "enum",
    enum: AccessibilityEventType,
    name: "event_type",
  })
  @Index()
  eventType: AccessibilityEventType

  @Column({
    type: "enum",
    enum: SeverityLevel,
    name: "severity_level",
  })
  severityLevel: SeverityLevel

  @Column({ name: "wcag_guideline", nullable: true })
  wcagGuideline?: string

  @Column({
    type: "enum",
    enum: WcagLevel,
    name: "wcag_level",
    nullable: true,
  })
  wcagLevel?: WcagLevel

  @Column({ name: "rule_id", nullable: true })
  ruleId?: string

  @Column({ name: "element_selector", nullable: true })
  elementSelector?: string

  @Column({ name: "page_url", nullable: true })
  pageUrl?: string

  @Column({ name: "user_id", nullable: true })
  @Index()
  userId?: string

  @Column({ name: "session_id", nullable: true })
  sessionId?: string

  @Column({ name: "user_agent", nullable: true })
  userAgent?: string

  @Column({ name: "assistive_technology", nullable: true })
  assistiveTechnology?: string

  @Column({ name: "title" })
  title: string

  @Column({ name: "description", type: "text" })
  description: string

  @Column({ name: "impact", nullable: true })
  impact?: string

  @Column({ name: "help_text", type: "text", nullable: true })
  helpText?: string

  @Column({ name: "help_url", nullable: true })
  helpUrl?: string

  @Column({ name: "element_html", type: "text", nullable: true })
  elementHtml?: string

  @Column({ name: "element_target", type: "jsonb", nullable: true })
  elementTarget?: string[]

  @Column({ name: "fix_suggestions", type: "jsonb", nullable: true })
  fixSuggestions?: string[]

  @Column({ name: "context_data", type: "jsonb", nullable: true })
  contextData?: Record<string, any>

  @Column({ name: "browser_info", type: "jsonb", nullable: true })
  browserInfo?: {
    name: string
    version: string
    platform: string
    mobile: boolean
  }

  @Column({ name: "viewport_info", type: "jsonb", nullable: true })
  viewportInfo?: {
    width: number
    height: number
    devicePixelRatio: number
  }

  @Column({ name: "color_scheme", nullable: true })
  colorScheme?: "light" | "dark" | "auto"

  @Column({ name: "reduced_motion", default: false })
  reducedMotion: boolean

  @Column({ name: "high_contrast", default: false })
  highContrast: boolean

  @Column({ name: "font_size_preference", nullable: true })
  fontSizePreference?: string

  @Column({ name: "is_resolved", default: false })
  isResolved: boolean

  @Column({ name: "resolved_at", nullable: true })
  resolvedAt?: Date

  @Column({ name: "resolved_by", nullable: true })
  resolvedBy?: string

  @Column({ name: "resolution_notes", nullable: true })
  resolutionNotes?: string

  @Column({ name: "tags", type: "jsonb", nullable: true })
  tags?: string[]

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date
}
