import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_read_model')
export class UserReadModelEntity {
  @PrimaryColumn()
  userId: string;

  @Column()
  email: string;

  @Column()
  username: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column()
  role: string;

  @Column()
  status: string;

  @Column({ default: 0 })
  loginCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ default: 0 })
  courseEnrollments: number;

  @Column({ default: 0 })
  completedCourses: number;

  @Column({ default: 0 })
  totalPoints: number;

  @Column('jsonb', { nullable: true })
  achievements?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
