import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grade } from '../entities/grade.entity';
import { Submission } from '../entities/submission.entity';
import { Assignment } from '../entities/assignment.entity';

@Injectable()
export class GradingService {
  constructor(
    @InjectRepository(Grade)
    private gradeRepository: Repository<Grade>,
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
  ) {}

  async calculateGrade(
    submissionId: string,
    rubricScores: Array<{ rubricId: string; score: number }>,
  ): Promise<number> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['assignment', 'assignment.rubrics'],
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    let totalScore = 0;
    let totalWeight = 0;

    // Calculate based on rubric
    for (const rubric of submission.assignment.rubrics) {
      const rubricScore = rubricScores.find((rs) => rs.rubricId === rubric.id);
      if (rubricScore) {
        const normalizedScore = (rubricScore.score / rubric.maxPoints) * 100;
        totalScore += normalizedScore * (rubric.weight / 100);
      }
      totalWeight += rubric.weight;
    }

    // Apply weights
    const finalScore = (totalScore / totalWeight) * submission.assignment.maxPoints;

    // Apply late penalty if applicable
    return this.applyLatePenalty(finalScore, submission);
  }

  private applyLatePenalty(score: number, submission: Submission): number {
    if (!submission.isLate || !submission.assignment.latePenalty) {
      return score;
    }

    const assignment = submission.assignment;
    const dueDate = new Date(assignment.dueDate);
    const submittedAt = new Date(submission.submittedAt);
    const daysLate = Math.ceil((submittedAt.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

    const penalty = (assignment.latePenalty * daysLate) / 100;
    const penaltyAmount = score * penalty;

    return Math.max(0, score - penaltyAmount);
  }

  async generateGradeReport(assignmentId: string): Promise<any> {
    const submissions = await this.submissionRepository.find({
      where: { assignment: { id: assignmentId } },
      relations: ['grade', 'student'],
    });

    const grades = submissions.map((submission) => ({
      studentId: submission.student.id,
      studentName: `${submission.student.firstName} ${submission.student.lastName}`,
      score: submission.grade?.score || 0,
      isLate: submission.isLate,
      submittedAt: submission.submittedAt,
      status: submission.status,
    }));

    // Calculate statistics
    const scores = grades.map((g) => g.score);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);

    return {
      assignmentId,
      grades,
      statistics: {
        average,
        max,
        min,
        totalStudents: grades.length,
        submissions: grades.filter((g) => g.status === 'submitted' || g.status === 'graded').length,
        lateSubmissions: grades.filter((g) => g.isLate).length,
      },
    };
  }

  exportToCSV(grades: any[]): string {
    const headers = ['Student ID', 'Name', 'Score', 'Late', 'Submitted At', 'Status'];
    const rows = grades.map((grade) => [
      grade.studentId,
      grade.studentName,
      grade.score,
      grade.isLate ? 'Yes' : 'No',
      grade.submittedAt,
      grade.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    return csvContent;
  }
}
