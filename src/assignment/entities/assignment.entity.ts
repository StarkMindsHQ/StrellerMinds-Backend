import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { IsNotEmpty, IsDateString } from 'class-validator';
// FIX: Changed absolute path to relative path for Jest compatibility
import { Lesson } from '../../lesson/entity/lesson.entity';

@Entity()
export class Assignment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @IsNotEmpty()
  title!: string;

  @Column('text')
  @IsNotEmpty()
  instructions!: string;

  @Column()
  @IsDateString()
  dueDate!: string;

  @ManyToOne(() => Lesson, (lesson) => lesson.assignments, {
    onDelete: 'CASCADE',
  })
  lesson!: Lesson;
}