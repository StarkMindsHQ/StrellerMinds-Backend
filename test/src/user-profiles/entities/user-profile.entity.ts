import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm"
import { User } from "../../users/entities/user.entity"

@Entity("user_profiles")
export class UserProfile {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ nullable: true })
  firstName: string

  @Column({ nullable: true })
  lastName: string

  @Column({ nullable: true })
  bio: string

  @Column({ nullable: true })
  avatarUrl: string

  @Column({ nullable: true })
  phoneNumber: string

  @Column({ nullable: true })
  address: string

  @Column({ nullable: true })
  city: string

  @Column({ nullable: true })
  country: string

  @Column({ nullable: true })
  postalCode: string

  @Column({ nullable: true })
  dateOfBirth: Date

  @Column({ default: false })
  isPublic: boolean

  @Column({ nullable: true })
  preferredLanguage: string; // e.g., 'en', 'fr', 'pt-BR'
  
  @OneToOne(
    () => User,
    (user) => user.profile,
  )
  @JoinColumn()
  user: User

  @Column()
  userId: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
