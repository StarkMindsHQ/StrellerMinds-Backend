import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export interface NotificationAction {
  action: string
  title: string
  icon?: string
  url?: string
}

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
  actions?: NotificationAction[]
  data?: any
}

@Entity("notification_templates")
@Index(["type", "isActive"])
export class NotificationTemplate {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 100, unique: true })
  @Index()
  type: string

  @Column({ type: "varchar", length: 255 })
  name: string

  @Column({ type: "text", nullable: true })
  description?: string

  @Column({ type: "varchar", length: 255 })
  title: string

  @Column({ type: "text" })
  body: string

  @Column({ type: "varchar", length: 500, nullable: true })
  icon?: string

  @Column({ type: "varchar", length: 500, nullable: true })
  badge?: string

  @Column({ type: "varchar", length: 500, nullable: true })
  image?: string

  @Column({ type: "varchar", length: 100, nullable: true })
  tag?: string

  @Column({ type: "boolean", default: false })
  requireInteraction: boolean

  @Column({ type: "boolean", default: false })
  silent: boolean

  @Column({ type: "json", nullable: true })
  actions?: NotificationAction[]

  @Column({ type: "json", nullable: true })
  defaultData?: any

  @Column({ type: "json", nullable: true })
  variables?: string[]

  @Column({ type: "boolean", default: true })
  @Index()
  isActive: boolean

  @Column({ type: "integer", default: 0 })
  priority: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Helper method to render template with variables
  render(variables: Record<string, any> = {}): NotificationOptions {
    const replaceVariables = (text: string): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] || match
      })
    }

    return {
      title: replaceVariables(this.title),
      body: replaceVariables(this.body),
      icon: this.icon,
      badge: this.badge,
      image: this.image,
      tag: this.tag,
      requireInteraction: this.requireInteraction,
      silent: this.silent,
      actions: this.actions,
      data: { ...this.defaultData, ...variables },
    }
  }
}
