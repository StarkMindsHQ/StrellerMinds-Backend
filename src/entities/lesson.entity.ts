import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Index } from 'typeorm';
import { Module } from './module.entity';
import { UserProgress } from './user-progress.entity';

@Entity('lessons')
export class Lesson {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ nullable: true })
    description: string;

    @Column()
    duration: number; // Duration in minutes

    @ManyToOne(() => Module, (module) => module.lessons, {
        eager: true,
        onDelete: 'CASCADE',
    })
    @Index()
    module: Module;

    @OneToMany(() => UserProgress, (userProgress) => userProgress.lesson, {
        cascade: true,
    })
    userProgress: UserProgress[];
}