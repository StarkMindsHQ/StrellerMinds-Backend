import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attempt } from '../entities/attempt.entity';
import { Assessment } from '../entities/assessment.entity';
import { AttemptAnswer } from '../entities/attempt-answer.entity';
import { Question, QuestionType } from '../entities/question.entity';
import { StartAttemptDto } from '../dto/start-attempt.dto';
import { SubmitAttemptDto } from '../dto/submit-attempt.dto';
import { PlagiarismService } from './plagiarism.service';
import { ProctoringSession } from '../entities/proctoring.entity';
import { User } from '../../auth/entities/user.entity';

@Injectable()
export class AttemptsService {
  private readonly logger = new Logger(AttemptsService.name);

  constructor(
    @InjectRepository(Attempt)
    private readonly attemptRepo: Repository<Attempt>,
    @InjectRepository(Assessment)
    private readonly assessmentRepo: Repository<Assessment>,
    @InjectRepository(AttemptAnswer)
    private readonly answerRepo: Repository<AttemptAnswer>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(ProctoringSession)
    private readonly proctorRepo: Repository<ProctoringSession>,
    private readonly plagiarismService: PlagiarismService,
  ) {}

  async startAttempt(dto: StartAttemptDto, studentId: string, ip?: string, ua?: string): Promise<Attempt> {
    const assessment = await this.assessmentRepo.findOne({ where: { id: dto.assessmentId }, relations: ['questions', 'questions.options'] });
    if (!assessment) throw new NotFoundException('Assessment not found');

    // Check availability window
    const now = new Date();
    if (assessment.availableFrom && now < new Date(assessment.availableFrom)) {
      throw new BadRequestException('Assessment not yet available');
    }
    if (assessment.availableTo && now > new Date(assessment.availableTo)) {
      throw new BadRequestException('Assessment window closed');
    }

    const attempt = this.attemptRepo.create({
      assessment: ({ id: assessment.id } as Assessment),
      student: ({ id: studentId } as User),
      startedAt: new Date(),
      submitted: false,
    });

    const saved = await this.attemptRepo.save(attempt);

    // create proctoring session record
    await this.proctorRepo.save(this.proctorRepo.create({ attempt: saved, ipAddress: ip, userAgent: ua, events: [] }));

    return this.attemptRepo.findOne({ where: { id: saved.id }, relations: ['assessment'] });
  }

  async submitAttempt(dto: SubmitAttemptDto, studentId: string): Promise<Attempt> {
    const attempt = await this.attemptRepo.findOne({ where: { id: dto.attemptId }, relations: ['assessment', 'assessment.questions', 'answers', 'answers.question'] });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.student && (attempt.student as any).id !== studentId) {
      throw new BadRequestException('Attempt does not belong to student');
    }

    // Save/replace answers
    if (dto.answers && dto.answers.length) {
      // remove existing answers for simplicity
      if (attempt.answers && attempt.answers.length) {
        await this.answerRepo.remove(attempt.answers);
      }

      const answers = dto.answers.map((a) => this.answerRepo.create({
        attempt: ({ id: attempt.id } as Attempt),
        question: ({ id: a.questionId } as Question),
        answerText: a.answerText,
        selectedOptionIds: a.selectedOptionIds,
      }));

      await this.answerRepo.save(answers);
    }

    // Re-fetch with answers
    const refreshed = await this.attemptRepo.findOne({ where: { id: attempt.id }, relations: ['assessment', 'assessment.questions', 'assessment.questions.options', 'answers', 'answers.question'] });

    // Auto-grade simple types
    let totalScore = 0;
    for (const answer of refreshed.answers || []) {
      const question = await this.questionRepo.findOne({ where: { id: answer.question.id }, relations: ['options'] });
      if (!question) continue;

      if (question.type === QuestionType.MULTIPLE_CHOICE) {
        // score based on option correctness
        const correctOptions = (question.options || []).filter((o) => o.isCorrect).map((o) => o.id);
        const selected = answer.selectedOptionIds || [];
        const intersection = selected.filter((s) => correctOptions.includes(s));
        const pts = question.maxPoints || 1;
        // simple proportional scoring
        const score = (intersection.length / Math.max(correctOptions.length, 1)) * pts;
        answer.score = Number(score.toFixed(2));
        totalScore += answer.score;
      } else if (question.type === QuestionType.CODING) {
        // naive grading: compare expected outputs
        let qScore = 0;
        const testCases = question.testCases || [];
        for (const tc of testCases) {
          // run naive text match against submitted code or output
          // Here we assume student included output in answerText or codeContent contains expected result lines
          if (!answer.answerText) continue;
          if (answer.answerText.includes(tc.expectedOutput)) {
            qScore += tc.points ?? (question.maxPoints || 1) / testCases.length;
          }
        }
        answer.score = Number(qScore.toFixed(2));
        totalScore += answer.score;
      } else if (question.type === QuestionType.ESSAY) {
        // Essays are left for manual grading but run plagiarism
        if (answer.answerText) {
          const res = await this.plagiarismService.checkPlagiarism(answer.answerText);
          // flagging handled in proctoring; store score as 0 until graded
          answer.score = 0;
          // attach a metadata field in feedback
          answer.feedback = `plagiarism:${res.score}`;
        }
      }

      await this.answerRepo.save(answer);
    }

    // finalize attempt
    refreshed.score = Number(totalScore.toFixed(2));
    refreshed.submitted = dto.finished ?? true;
    refreshed.completedAt = new Date();

    const savedAttempt = await this.attemptRepo.save(refreshed);

    this.logger.log(`Attempt ${savedAttempt.id} submitted by ${studentId} score=${savedAttempt.score}`);

    return savedAttempt;
  }

  async logProctorEvent(attemptId: string, event: any): Promise<void> {
    const session = await this.proctorRepo.findOne({ where: { attempt: { id: attemptId } } });
    if (!session) return;
    session.events = session.events || [];
    session.events.push(event);
    // Simple heuristic: flag if too many focus_lost events
    const focusLostCount = (session.events || []).filter((e) => e.type === 'focus_lost').length;
    if (focusLostCount >= 3) session.flagged = true;
    await this.proctorRepo.save(session);
  }
}
