import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assessment } from '../entities/assessment.entity';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { Question } from '../entities/question.entity';

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    @InjectRepository(Assessment)
    private readonly assessmentRepo: Repository<Assessment>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
  ) {}

  async create(dto: CreateAssessmentDto): Promise<Assessment> {
    const assessment = this.assessmentRepo.create({
      title: dto.title,
      description: dto.description,
      mode: dto.mode,
      availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : undefined,
      availableTo: dto.availableTo ? new Date(dto.availableTo) : undefined,
      timeLimitMinutes: dto.timeLimitMinutes ?? 0,
    });

    if (dto.questions && dto.questions.length) {
      assessment.questions = dto.questions.map((q) => this.questionRepo.create(q as any));
    }

    const saved = await this.assessmentRepo.save(assessment);
    this.logger.log(`Assessment ${saved.id} created`);
    return saved;
  }

  async findOne(id: string): Promise<Assessment> {
    const a = await this.assessmentRepo.findOne({ where: { id }, relations: ['questions', 'questions.options'] });
    if (!a) throw new NotFoundException('Assessment not found');
    return a;
  }

  async findAll(): Promise<Assessment[]> {
    return this.assessmentRepo.find({ relations: ['questions'] });
  }

  async generateReport(assessmentId: string): Promise<any> {
    const assessment = await this.assessmentRepo.findOne({ where: { id: assessmentId } });
    if (!assessment) throw new NotFoundException('Assessment not found');

    // Simple analytics using SQL is possible, but keep it lightweight here
    const attempts = await this.assessmentRepo.manager.getRepository('attempts').find({ where: { assessment: { id: assessmentId } } });
    const total = attempts.length;
    const submitted = attempts.filter((a: any) => a.submitted).length;
    const avg = attempts.reduce((s: number, a: any) => s + (a.score || 0), 0) / Math.max(total, 1);

    return {
      assessmentId,
      totalAttempts: total,
      submittedAttempts: submitted,
      averageScore: Number(avg.toFixed(2)),
    };
  }
}
