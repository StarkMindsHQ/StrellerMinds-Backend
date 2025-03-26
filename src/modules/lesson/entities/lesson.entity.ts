import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { LessonType } from '../enums/lesson-type.enum';
import { Module } from 'src/module/entities/module.entity';

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  order: number;

  @Column({
    type: 'enum',
    enum: LessonType,
    default: LessonType.TEXT,
  })
  type: LessonType;

  @Column('text', { nullable: true })
  content?: string;

  @Column({ nullable: true })
  videoUrl?: string;

  @Column('json', { nullable: true })
  resources?: Record<string, any>[];

  @ManyToOne(() => Module, (module) => module.lessons)
  module: Module;

  @Column()
  moduleId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
