import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { Course } from './course.entity';
import { UserProgress } from './user-progress.entity';
import { WalletInfo } from './wallet-info.entity';
import { RefreshToken } from './refresh-token.entity';
import { EmailVerificationToken } from './email-verification-token.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { Notification } from './notification.entity';
import { CourseReview } from './course-review.entity';
import { ForumPost } from './forum-post.entity';
import { ForumComment } from './forum-comments.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => UserProgress, (userProgress) => userProgress.user, {
        cascade: true,
    })
    userProgress: UserProgress[];

    @OneToMany(() => WalletInfo, (walletInfo) => walletInfo.user, {
        cascade: true,
    })
    walletInfo: WalletInfo[];

    @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user, {
        cascade: true,
    })
    refreshTokens: RefreshToken[];

    @OneToMany(
        () => EmailVerificationToken,
        (emailVerificationToken) => emailVerificationToken.user,
        { cascade: true },
    )
    emailVerificationTokens: EmailVerificationToken[];

    @OneToMany(
        () => PasswordResetToken,
        (passwordResetToken) => passwordResetToken.user,
        { cascade: true },
    )
    passwordResetTokens: PasswordResetToken[];

    @OneToMany(() => Notification, (notification) => notification.user, {
        cascade: true,
    })
    notifications: Notification[];

    @OneToMany(() => CourseReview, (courseReview) => courseReview.user, {
        cascade: true,
    })
    courseReviews: CourseReview[];

    @OneToMany(() => ForumPost, (forumPost) => forumPost.author, {
        cascade: true,
    })
    forumPosts: ForumPost[];

    @OneToMany(() => ForumComment, (forumComment) => forumComment.author, {
        cascade: true,
    })
    forumComments: ForumComment[];

    @OneToMany(() => Course, (course) => course.instructor)
    instructedCourses: Course[];

    @ManyToMany(() => Course, (course) => course.enrolledUsers)
    enrolledCourses: Course[];
}