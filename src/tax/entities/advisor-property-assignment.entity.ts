import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaxAdvisor } from './tax-advisor.entity';

@Index('UQ_advisor_property_active', ['advisorId', 'propertyId'], {
  unique: true,
  where: '"unassignedAt" IS NULL',
})
@Index('IDX_assignment_property', ['propertyId'])
@Entity('advisor_property_assignments')
export class AdvisorPropertyAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  advisorId: string;

  @ManyToOne(() => TaxAdvisor, (advisor) => advisor.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'advisorId' })
  advisor: TaxAdvisor;

  @Column({ length: 128 })
  propertyId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  assignedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  unassignedAt: Date | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
