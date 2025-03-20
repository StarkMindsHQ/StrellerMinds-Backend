import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, Index } from 'typeorm';
import { ForumComment } from './forum-comments.entity';
import { ForumTopic } from './forum-topics.entity';
import { User } from './user.entity';


@Entity('forum_posts')
export class ForumPost {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    content: string;

    @ManyToOne(() => ForumTopic, (forumTopic) => forumTopic.posts, {
        eager: true,
        onDelete: 'CASCADE',
    })
    @Index()
    topic: ForumTopic;

    @ManyToOne(() => User, (user) => user.forumPosts, {
        eager: true,
        onDelete: 'SET NULL',
    })
    @Index()
    author: User;

    @OneToMany(() => ForumComment, (forumComment) => forumComment.post, {
        cascade: true,
    })
    comments: ForumComment[];
}