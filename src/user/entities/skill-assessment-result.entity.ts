import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { SkillAssessment } from './skill-assessment.entity';
import { Skill } from './skill.entity';

@Entity('skill_assessment_results')
export class SkillAssessmentResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserProfile, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_id' })
  profile: UserProfile;

  @Column({ type: 'uuid', name: 'profile_id' })
  profileId: string;

  @ManyToOne(() => SkillAssessment, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assessment_id' })
  assessment: SkillAssessment;

  @Column({ type: 'uuid', name: 'assessment_id' })
  assessmentId: string;

  @ManyToOne(() => Skill, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'skill_id' })
  skill: Skill;

  @Column({ type: 'uuid', name: 'skill_id' })
  skillId: string;

  @Column({ type: 'int' })
  score: number; // 0-100

  @Column({ type: 'int' })
  correctAnswers: number;

  @Column({ type: 'int' })
  totalQuestions: number;

  @Column({ type: 'int' })
  timeTakenMinutes: number;

  @Column({ type: 'boolean' })
  isPassed: boolean;

  @Column({ type: 'varchar', length: 50 })
  status: 'completed' | 'in_progress' | 'abandoned';

  @Column({ type: 'simple-json', nullable: true })
  answers: Array<{
    questionId: string;
    answer: string | string[];
    isCorrect: boolean;
    points: number;
  }>;

  @Column({ type: 'simple-json', nullable: true })
  skillBreakdown: Record<string, number>; // Score by sub-skill

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
