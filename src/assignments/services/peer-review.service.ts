import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PeerReview } from '../entities/peer-review.entity';
import { Submission } from '../entities/submission.entity';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class PeerReviewService {
  constructor(
    @InjectRepository(PeerReview)
    private peerReviewRepository: Repository<PeerReview>,
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
  ) {}

  async assignPeerReviews(assignmentId: string, reviewsPerSubmission: number = 3): Promise<void> {
    const submissions = await this.submissionRepository.find({
      where: { assignment: { id: assignmentId } },
      relations: ['student'],
    });

    const students = submissions.map((s) => s.student);

    // Shuffle students for random assignment
    const shuffledStudents = [...students].sort(() => Math.random() - 0.5);

    for (let i = 0; i < submissions.length; i++) {
      const submission = submissions[i];
      const reviewers = this.getReviewersForStudent(
        students[i],
        shuffledStudents,
        reviewsPerSubmission,
      );

      for (const reviewer of reviewers) {
        const existingReview = await this.peerReviewRepository.findOne({
          where: {
            submission: { id: submission.id },
            reviewer: { id: reviewer.id },
          },
        });

        if (!existingReview) {
          const peerReview = this.peerReviewRepository.create({
            submission,
            reviewer,
            rubricScores: [],
            overallScore: 0,
            isAnonymous: true,
          });
          await this.peerReviewRepository.save(peerReview);
        }
      }
    }
  }

  private getReviewersForStudent(student: User, allStudents: User[], count: number): User[] {
    const otherStudents = allStudents.filter((s) => s.id !== student.id);
    return otherStudents.slice(0, count);
  }

  async calculateAveragePeerScore(submissionId: string): Promise<number> {
    const reviews = await this.peerReviewRepository.find({
      where: { submission: { id: submissionId } },
    });

    if (reviews.length === 0) {
      return 0;
    }

    const averageScore =
      reviews.reduce((sum, review) => sum + review.overallScore, 0) / reviews.length;
    return averageScore;
  }
}
