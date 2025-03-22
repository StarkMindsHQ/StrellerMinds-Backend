import { CourseModule } from "../../courses/entities/course-module.entity"
import { UserProgress } from "../../users/entities/user-progress.entity"
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    Index,
    CreateDateColumn,
    UpdateDateColumn,
} from "typeorm"

@Entity("lessons")
export class Lesson {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({ length: 255 })
    title: string

    @Column({ type: "text" })
    content: string

    @Column({ default: "text" })
    type: string // text, video, quiz, etc.

    @Column({ nullable: true })
    videoUrl: string

    @Column()
    order: number

    @Column({ default: 0 })
    durationInMinutes: number

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    // Many-to-One relationship
    @ManyToOne(
        () => CourseModule,
        (module) => module.lessons,
        { nullable: false, onDelete: "CASCADE" },
    )
    @Index()
    module: CourseModule

    // One-to-Many relationship
    @OneToMany(
        () => UserProgress,
        (progress) => progress.lesson,
    )
    userProgress: Promise<UserProgress[]>
} 