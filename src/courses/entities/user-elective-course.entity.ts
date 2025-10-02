import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from 'src/user/user.entity';
import { ElectiveCourse } from 'src/elective-course/elective-course.entity';

@Entity('user_elective_courses')
export class UserElectiveCourse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.enrollments, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => ElectiveCourse, (course) => course.enrollments, { onDelete: 'CASCADE' })
  electiveCourse: ElectiveCourse;
  
  @OneToMany(() => UserElectiveCourse, (enrollment) => enrollment.electiveCourse)
  enrollments: UserElectiveCourse[];

  @CreateDateColumn()
  enrolledAt: Date;
}
