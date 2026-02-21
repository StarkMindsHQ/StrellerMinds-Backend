import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { Skill } from './skill.entity';
import { SkillEndorsement } from './skill-endorsement.entity';

@Entity('user_skills')
export class UserSkill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserProfile, (profile) => profile.skills, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_id' })
  profile: UserProfile;

  @Column({ type: 'uuid', name: 'profile_id' })
  profileId: string;

  @ManyToOne(() => Skill, (skill) => skill.userSkills, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'skill_id' })
  skill: Skill;

  @Column({ type: 'uuid', name: 'skill_id' })
  skillId: string;

  @Column({ type: 'int', default: 1 })
  proficiencyLevel: number;

  @Column({ type: 'int', default: 0 })
  yearsOfExperience: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ type: 'boolean', default: true })
  isVerified: boolean;

  @Column({ type: 'int', default: 0 })
  endorsementCount: number;

  @Column({ type: 'simple-json', nullable: true })
  certifications: Array<{
    name: string;
    issuer: string;
    dateObtained: Date;
    expiryDate?: Date;
    credentialUrl?: string;
  }>;

  @Column({ type: 'simple-json', nullable: true })
  projects: Array<{
    name: string;
    description: string;
    url?: string;
  }>;

  @Column({ type: 'int', default: 0 })
  assessmentScore: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAssessedAt: Date;

  @OneToMany(() => SkillEndorsement, (endorsement) => endorsement.userSkill, {
    cascade: true,
  })
  endorsements: SkillEndorsement[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
