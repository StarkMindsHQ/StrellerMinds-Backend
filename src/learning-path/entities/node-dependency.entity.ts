import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { LearningPathNode } from './learning-path-node.entity';

export enum DependencyType {
  PREREQUISITE = 'prerequisite', // Source must be completed before target
  COREQUISITE = 'corequisite', // Source and target can be taken together
  RECOMMENDED = 'recommended', // Source is recommended but not required
  UNLOCKS = 'unlocks', // Source unlocks target (conditional access)
}

@Entity('node_dependencies')
@Index(['sourceNodeId', 'targetNodeId'])
@Index(['type'])
export class NodeDependency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sourceNodeId: string;

  @ManyToOne(() => LearningPathNode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sourceNodeId' })
  sourceNode: LearningPathNode;

  @Column({ type: 'uuid' })
  targetNodeId: string;

  @ManyToOne(() => LearningPathNode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'targetNodeId' })
  targetNode: LearningPathNode;

  @Column({ type: 'enum', enum: DependencyType, default: DependencyType.PREREQUISITE })
  type: DependencyType;

  @Column({ type: 'simple-json', default: {} })
  conditions: Record<string, any>; // Conditions for dependency (e.g., minimum score)

  @CreateDateColumn()
  createdAt: Date;
}
