import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface Widget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'gauge';
  title: string;
  configuration: Record<string, any>;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

@Entity('dashboards')
export class Dashboard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('jsonb')
  widgets: Widget[];

  @Column('jsonb', { nullable: true })
  filters?: Record<string, any>;

  @Column({ default: true })
  isPublic: boolean;

  @Column({ nullable: true })
  createdBy?: string;

  @Column('simple-array', { nullable: true })
  sharedWith?: string[];

  @Column({ default: 30 })
  refreshInterval: number; // in seconds

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
