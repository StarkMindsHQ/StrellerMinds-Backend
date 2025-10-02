import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Content } from './content.entity';

@Entity('content_versions')
export class ContentVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Content, (content) => content.versions, { onDelete: 'CASCADE' })
  content!: Content;

  @Column()
  title!: string;

  @Column('text')
  body!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
