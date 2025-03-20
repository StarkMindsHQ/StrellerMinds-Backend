import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, ManyToMany, JoinTable, Index } from 'typeorm';
import { Module } from './module.entity';
import { Certificate } from './certificate.entity';
import { CourseReview } from './course-review.entity';
import { Payment } from './payment.entity';
import { UserProgress } from './user-progress.entity';
import { Category } from './category.entity';
import { User } from './user.entity';
import { Tag } from './tag.entity';


@Entity('courses')
export class Course {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ nullable: true })
    description: string;

    @Column()
    price: number;

    @ManyToOne(() => Category, (category) => category.courses, {
        eager: true,
        onDelete: 'SET NULL',
    })
    @Index()
    category: Category;

    @ManyToOne(() => User, (user) => user.instructedCourses, {
        eager: true,
        onDelete: 'SET NULL',
    })
    @Index()
    instructor: User;

    @OneToMany(() => Module, (module) => module.course, {
        cascade: true,
    })
    modules: Module[];

    @OneToMany(() => Certificate, (certificate) => certificate.course, {
        cascade: true,
    })
    certificates: Certificate[];

    @OneToMany(() => CourseReview, (courseReview) => courseReview.course, {
        cascade: true,
    })
    reviews: CourseReview[];

    @OneToMany(() => Payment, (payment) => payment.course, {
        cascade: true,
    })
    payments: Payment[];

    @OneToMany(() => UserProgress, (userProgress) => userProgress.course, {
        cascade: true,
    })
    userProgress: UserProgress[];

    @ManyToMany(() => Tag, (tag) => tag.courses, {
        cascade: true,
    })
    @JoinTable()
    tags: Tag[];

    @ManyToMany(() => User, (user) => user.enrolledCourses, {
        cascade: ['insert', 'update']
    })
    @JoinTable()
    enrolledUsers: User[];
}