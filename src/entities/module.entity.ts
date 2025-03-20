import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Index } from 'typeorm';
import { Course } from './course.entity';
import { Lesson } from './lesson.entity';

@Entity('modules')
export class Module {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ nullable: true })
    description: string;

    @ManyToOne(() => Course, (course) => course.modules, {
        eager: true,
        onDelete: 'CASCADE',
    })
    @Index()
    course: Course;

    @OneToMany(() => Lesson, (lesson) => lesson.module, {
        cascade: true,
    })
    lessons: Lesson[];
}