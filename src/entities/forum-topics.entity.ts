import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, Index } from 'typeorm';
import { ForumCategory } from './forum-categories.entity';
import { ForumPost } from './forum-post.entity';

@Entity('forum_topics')
export class ForumTopic {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @ManyToOne(() => ForumCategory, (forumCategory) => forumCategory.topics, {
        eager: true,
        onDelete: 'CASCADE',
    })
    @Index()
    category: ForumCategory;

    @OneToMany(() => ForumPost, (forumPost) => forumPost.topic, {
        cascade: true,
    })
    posts: ForumPost[];
}