import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { UserSkill } from './user-skill.entity';

@Entity('skill_endorsements')
export class SkillEndorsement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserSkill, (userSkill) => userSkill.endorsements, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_skill_id' })
  userSkill: UserSkill;

  @Column({ type: 'uuid', name: 'user_skill_id' })
  userSkillId: string;

  @ManyToOne(() => UserProfile, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'endorser_id' })
  endorser: UserProfile;

  @Column({ type: 'uuid', name: 'endorser_id' })
  endorserId: string;

  @Column({ type: 'int', default: 1 })
  weight: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  relationship: 'colleague' | 'manager' | 'report' | 'client' | 'peer' | 'other';

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'simple-json', nullable: true })
  workExperience: {
    company?: string;
    project?: string;
    duration?: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}
