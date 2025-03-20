import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity('certificates')
export class Certificate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ nullable: true })
    description: string;

    @Column()
    issueDate: Date;

    @ManyToOne(() => User, (user) => user.userProgress, {
        eager: true,
        onDelete: 'CASCADE',
    })
    @Index()
    user: User;

    @ManyToOne(() => Course, (course) => course.certificates, {
        eager: true,
        onDelete: 'CASCADE',
    })
    @Index()
    course: Course;
}