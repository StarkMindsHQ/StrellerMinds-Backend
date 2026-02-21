import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserSkill } from './user-skill.entity';

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  category: 'technical' | 'soft' | 'language' | 'creative' | 'business' | 'other';

  @Column({ type: 'varchar', length: 100, nullable: true })
  parentSkillId: string; // For hierarchical skills

  @Column({ type: 'simple-json', nullable: true })
  relatedSkills: string[]; // Array of related skill IDs

  @Column({ type: 'varchar', length: 255, nullable: true })
  iconUrl: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  totalEndorsements: number;

  @Column({ type: 'int', default: 0 })
  userCount: number; // Number of users with this skill

  @OneToMany(() => UserSkill, (userSkill) => userSkill.skill, {
    cascade: true,
  })
  userSkills: UserSkill[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
