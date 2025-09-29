import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
// import { Lesson } from './lesson.entity';
import { IsNotEmpty, IsDateString } from 'class-validator';
// import { Lesson } from 'src/modules/lesson/entities/lesson.entity';
import { Lesson } from 'src/lesson/entity/lesson.entity';

@Entity()
export class Assignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsNotEmpty()
  title: string;

  @Column('text')
  @IsNotEmpty()
  instructions: string;

  @Column()
  @IsDateString()
  dueDate: string;

  @ManyToOne(() => Lesson, (lesson) => lesson.assignments, {
    onDelete: 'CASCADE',
  })
  lesson: Lesson;
}
