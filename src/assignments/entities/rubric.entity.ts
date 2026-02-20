import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Assignment } from './assignment.entity';

@Entity('rubrics')
export class Rubric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Assignment, (assignment) => assignment.rubrics)
  assignment: Assignment;

  @Column()
  criteria: string;

  @Column('text')
  description: string;

  @Column()
  maxPoints: number;

  @Column()
  weight: number; // Percentage weight for this criteria

  @Column('simple-array', { nullable: true })
  levels?: string[]; // ["Excellent: 4", "Good: 3", "Fair: 2", "Poor: 1"]
}
