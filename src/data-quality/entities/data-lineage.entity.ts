import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum LineageType {
  SOURCE = 'source',
  TRANSFORMATION = 'transformation',
  DESTINATION = 'destination',
  DEPENDENCY = 'dependency',
}

@Entity('data_lineage')
@Index(['sourceEntity', 'targetEntity'])
@Index(['lineageType', 'createdAt'])
export class DataLineage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sourceEntity: string;

  @Column({ nullable: true })
  sourceField?: string;

  @Column()
  targetEntity: string;

  @Column({ nullable: true })
  targetField?: string;

  @Column({
    type: 'enum',
    enum: LineageType,
  })
  lineageType: LineageType;

  @Column('text', { nullable: true })
  transformationLogic?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @Column({ nullable: true })
  processName?: string;

  @Column({ nullable: true })
  processVersion?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
