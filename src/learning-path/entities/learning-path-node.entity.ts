import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { LearningPath } from './learning-path.entity';
import { LearningObjective } from './learning-objective.entity';
import { NodeDependency } from './node-dependency.entity';

export enum NodeType {
  COURSE = 'course',
  MODULE = 'module',
  ASSESSMENT = 'assessment',
  PROJECT = 'project',
  MILESTONE = 'milestone',
}

export enum NodeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMPLETED = 'completed',
}

@Entity('learning_path_nodes')
@Index(['learningPathId', 'position'])
@Index(['courseId'])
export class LearningPathNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  learningPathId: string;

  @ManyToOne(() => LearningPath, path => path.nodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'learningPathId' })
  learningPath: LearningPath;

  @Column({ type: 'enum', enum: NodeType })
  type: NodeType;

  @Column({ type: 'uuid', nullable: true })
  courseId: string;

  @ManyToOne(() => Course, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 0 })
  position: number;

  @Column({ type: 'enum', enum: NodeStatus, default: NodeStatus.ACTIVE })
  @Index()
  status: NodeStatus;

  @Column({ default: 0 })
  estimatedDurationHours: number;

  @Column({ type: 'simple-json', default: {} })
  metadata: Record<string, any>;

  // Prerequisites - nodes that must be completed before this node
  @ManyToMany(() => LearningPathNode)
  @JoinTable({
    name: 'node_prerequisites',
    joinColumn: { name: 'nodeId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'prerequisiteNodeId', referencedColumnName: 'id' },
  })
  prerequisites: LearningPathNode[];

  // Dependencies - nodes that depend on this node
  @OneToMany(() => NodeDependency, dep => dep.sourceNode)
  outgoingDependencies: NodeDependency[];

  @OneToMany(() => NodeDependency, dep => dep.targetNode)
  incomingDependencies: NodeDependency[];

  // Learning objectives mapped to this node
  @ManyToMany(() => LearningObjective)
  @JoinTable({
    name: 'node_learning_objectives',
    joinColumn: { name: 'nodeId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'objectiveId', referencedColumnName: 'id' },
  })
  learningObjectives: LearningObjective[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}