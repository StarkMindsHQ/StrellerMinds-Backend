import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdvisorPropertyAssignment } from './advisor-property-assignment.entity';

@Index('IDX_tax_advisor_email', ['email'], { unique: true })
@Index('IDX_tax_advisor_license', ['licenseNumber'], { unique: true })
@Index('IDX_tax_advisor_isActive', ['isActive'])
@Entity('tax_advisors')
export class TaxAdvisor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 320 })
  email: string;

  @Column({ length: 64 })
  licenseNumber: string;

  @Column({ type: 'date' })
  licenseExpiresAt: Date;

  @Column({ type: 'simple-array' })
  jurisdictions: string[];

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => AdvisorPropertyAssignment, (assignment) => assignment.advisor)
  assignments: AdvisorPropertyAssignment[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
