import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  Tree,
  TreeChildren,
  TreeParent,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Course } from './course.entity';

@Entity()
@Tree('closure-table')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  name: string;

  @Column({ nullable: true })
  description?: string;

  /**
   * Example:
   * Programming
   *   └── Blockchain
   *       └──stellar
   */
  @TreeParent()
  parent: Category;

  @TreeChildren()
  children: Category[];

  @ManyToMany(() => Course, (course) => course.categories)
  courses: Course[];

  @CreateDateColumn()
  createdAt: Date;
}
