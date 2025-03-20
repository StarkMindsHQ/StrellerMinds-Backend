import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity('payments')
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    amount: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    paymentDate: Date;

    @Column({ nullable: true })
    paymentMethod: string;

    @ManyToOne(() => User, (user) => user.walletInfo, {
        eager: true,
        onDelete: 'SET NULL',
    })
    @Index()
    user: User;

    @ManyToOne(() => Course, (course) => course.payments, {
        eager: true,
        onDelete: 'CASCADE',
    })
    @Index()
    course: Course;
}