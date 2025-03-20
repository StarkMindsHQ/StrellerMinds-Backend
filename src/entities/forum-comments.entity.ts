import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { ForumPost } from './forum-post.entity';
import { User } from './user.entity';

@Entity('forum_comments')
export class ForumComment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    content: string;

    @ManyToOne(() => ForumPost, (forumPost) => forumPost.comments, {
        eager: true,
        onDelete: 'CASCADE',
    })
    @Index()
    post: ForumPost;

    @ManyToOne(() => User, (user) => user.forumComments, {
        eager: true,
        onDelete: 'SET NULL',
    })
    @Index()
    author: User;
}