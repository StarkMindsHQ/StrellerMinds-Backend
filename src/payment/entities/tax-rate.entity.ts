import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tax_rates')
export class TaxRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  country: string;

  @Column('varchar', { nullable: true })
  state: string;

  @Column('varchar', { nullable: true })
  region: string;

  @Column('decimal', { precision: 5, scale: 2 })
  rate: number;

  @Column('varchar', { nullable: true })
  type: string; // VAT, GST, Sales Tax, etc.

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('timestamp', { nullable: true })
  effectiveFrom: Date;

  @Column('timestamp', { nullable: true })
  effectiveTo: Date;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
