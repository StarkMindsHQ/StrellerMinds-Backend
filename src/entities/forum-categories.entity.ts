import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ForumTopic } from './forum-topics.entity';

@Entity('forum_categories')
export class ForumCategory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @OneToMany(() => ForumTopic, (forumTopic) => forumTopic.category, {
        cascade: true,
    })
    topics: ForumTopic[];
}