import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity('course_reviews')
export class CourseReview {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    reviewText: string;

    @Column({ type: 'int', default: 0 })
    rating: number; // Rating out of 5

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @ManyToOne(() => User, (user) => user.courseReviews, {
        eager: true,
        onDelete: 'CASCADE',
    })
    @Index()
    user: User;

    @ManyToOne(() => Course, (course) => course.reviews, {
        eager: true,
        onDelete: 'CASCADE',
    })
    @Index()
    course: Course;
}