import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AbTestStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

export enum AbTestWinnerCriteria {
  OPEN_RATE = 'open_rate',
  CLICK_RATE = 'click_rate',
  CONVERSION_RATE = 'conversion_rate',
}

export interface AbTestVariant {
  id: string; // 'control' | 'variant_a' | 'variant_b' ...
  label: string;
  templateVersionId: string;
  weight: number; // 0-100, must sum to 100 across variants
  stats: {
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
    unsubscribed: number;
    bounced: number;
  };
}

@Entity('email_ab_tests')
@Index(['templateId', 'status'])
export class EmailAbTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  templateId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  hypothesis: string;

  @Column({ type: 'enum', enum: AbTestStatus, default: AbTestStatus.DRAFT })
  status: AbTestStatus;

  @Column({ type: 'enum', enum: AbTestWinnerCriteria, default: AbTestWinnerCriteria.OPEN_RATE })
  winnerCriteria: AbTestWinnerCriteria;

  @Column({ type: 'jsonb' })
  variants: AbTestVariant[];

  @Column({ type: 'int', default: 95 })
  confidenceThreshold: number; // e.g. 95 = 95% statistical confidence

  @Column({ type: 'int', nullable: true })
  minSampleSize: number; // per variant before declaring winner

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  scheduledEndAt: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  winnerId: string; // variant id that won

  @Column({ type: 'uuid' })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
