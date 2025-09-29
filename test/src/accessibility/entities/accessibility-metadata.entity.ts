import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export enum ContentType {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  DOCUMENT = "document",
  FORM = "form",
  BUTTON = "button",
  LINK = "link",
  HEADING = "heading",
  TABLE = "table",
  LIST = "list",
  NAVIGATION = "navigation",
  LANDMARK = "landmark",
}

export enum AriaRole {
  BUTTON = "button",
  LINK = "link",
  HEADING = "heading",
  BANNER = "banner",
  NAVIGATION = "navigation",
  MAIN = "main",
  COMPLEMENTARY = "complementary",
  CONTENTINFO = "contentinfo",
  SEARCH = "search",
  FORM = "form",
  REGION = "region",
  ARTICLE = "article",
  SECTION = "section",
  ASIDE = "aside",
  DIALOG = "dialog",
  ALERT = "alert",
  STATUS = "status",
  PROGRESSBAR = "progressbar",
  TAB = "tab",
  TABPANEL = "tabpanel",
  TABLIST = "tablist",
  MENU = "menu",
  MENUITEM = "menuitem",
  TREE = "tree",
  TREEITEM = "treeitem",
  GRID = "grid",
  GRIDCELL = "gridcell",
  ROW = "row",
  COLUMNHEADER = "columnheader",
  ROWHEADER = "rowheader",
}

@Entity("accessibility_metadata")
@Index(["contentId", "contentType"])
@Index(["entityType", "entityId"])
export class AccessibilityMetadata {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ name: "content_id" })
  @Index()
  contentId: string

  @Column({
    type: "enum",
    enum: ContentType,
    name: "content_type",
  })
  contentType: ContentType

  @Column({ name: "entity_type", nullable: true })
  entityType?: string

  @Column({ name: "entity_id", nullable: true })
  entityId?: string

  @Column({ name: "alt_text", nullable: true })
  altText?: string

  @Column({ name: "aria_label", nullable: true })
  ariaLabel?: string

  @Column({ name: "aria_describedby", nullable: true })
  ariaDescribedby?: string

  @Column({ name: "aria_labelledby", nullable: true })
  ariaLabelledby?: string

  @Column({
    type: "enum",
    enum: AriaRole,
    name: "aria_role",
    nullable: true,
  })
  ariaRole?: AriaRole

  @Column({ name: "title", nullable: true })
  title?: string

  @Column({ name: "description", nullable: true })
  description?: string

  @Column({ name: "long_description", nullable: true })
  longDescription?: string

  @Column({ name: "caption", nullable: true })
  caption?: string

  @Column({ name: "summary", nullable: true })
  summary?: string

  @Column({ name: "transcript", type: "text", nullable: true })
  transcript?: string

  @Column({ name: "language_code", default: "en" })
  languageCode: string

  @Column({ name: "reading_order", nullable: true })
  readingOrder?: number

  @Column({ name: "heading_level", nullable: true })
  headingLevel?: number

  @Column({ name: "table_headers", type: "jsonb", nullable: true })
  tableHeaders?: Record<string, string>

  @Column({ name: "form_labels", type: "jsonb", nullable: true })
  formLabels?: Record<string, string>

  @Column({ name: "keyboard_shortcuts", type: "jsonb", nullable: true })
  keyboardShortcuts?: Record<string, string>

  @Column({ name: "focus_management", type: "jsonb", nullable: true })
  focusManagement?: {
    focusable: boolean
    tabIndex?: number
    focusOrder?: number
    skipLink?: boolean
  }

  @Column({ name: "color_contrast", type: "jsonb", nullable: true })
  colorContrast?: {
    foreground: string
    background: string
    ratio: number
    level: "AA" | "AAA"
  }

  @Column({ name: "media_alternatives", type: "jsonb", nullable: true })
  mediaAlternatives?: {
    audioDescription?: string
    captions?: string
    signLanguage?: string
    transcript?: string
  }

  @Column({ name: "is_decorative", default: false })
  isDecorative: boolean

  @Column({ name: "is_hidden", default: false })
  isHidden: boolean

  @Column({ name: "is_interactive", default: false })
  isInteractive: boolean

  @Column({ name: "requires_javascript", default: false })
  requiresJavascript: boolean

  @Column({ name: "compliance_level", default: "AA" })
  complianceLevel: "A" | "AA" | "AAA"

  @Column({ name: "validation_status", default: "pending" })
  validationStatus: "pending" | "valid" | "invalid" | "warning"

  @Column({ name: "validation_errors", type: "jsonb", nullable: true })
  validationErrors?: string[]

  @Column({ name: "validation_warnings", type: "jsonb", nullable: true })
  validationWarnings?: string[]

  @Column({ name: "custom_attributes", type: "jsonb", nullable: true })
  customAttributes?: Record<string, any>

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date
}
