import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ContentVersion } from './content-version.entity';
import { ContentStatus } from '../enums/content-status.enum';

@Entity('content')
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column('text')
  body!: string;

  @Column({ type: 'enum', enum: ContentStatus, default: ContentStatus.DRAFT })
  status!: ContentStatus;

  @ManyToOne(() => User)
  author!: User;

  @OneToMany(() => ContentVersion, (version) => version.content)
  versions!: ContentVersion[];

  @Column('simple-array', { nullable: true })
  tags!: string[];

  @Column({ nullable: true })
  category!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
