import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, Index } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';
import { Lesson } from './lesson.entity';

@Entity('user_progress')
export class UserProgress {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, (user) => user.userProgress, {
        eager: true,
        onDelete: 'CASCADE',
    })
    @Index()
    user: User;

    @ManyToOne(() => Course, (course) => course.userProgress, {
        eager: true,
        onDelete: 'CASCADE',
    })
    @Index()
    course: Course;

    @ManyToOne(() => Lesson, (lesson) => lesson.userProgress, {
        eager: true,
        onDelete: 'CASCADE',
    })
    @Index()
    lesson: Lesson;

    @Column({ type: 'float', default: 0 })
    progressPercentage: number; // Progress percentage (0-100)

    @Column({ type: 'boolean', default: false })
    completed: boolean; // Indicates if the lesson is completed
}