import { Exclude } from "class-transformer"
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"
import { UserRole } from "../enums/userRole.enum"

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ unique: true })
  email: string

  @Column()
  @Exclude({ toPlainOnly: true })
  password: string

  @Column()
  firstName: string

  @Column()
  lastName: string

  @Column({ nullable: true })
  profilePicture: string

  @Column({ nullable: true })
  bio: string

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole

  @Column({ default: false })
  isEmailVerified: boolean

  @Column({ default: true })
  isActive: boolean

  @Column({ nullable: true })
  lastLogin: Date

  @Column({ nullable: true })
  intructorCourses: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}