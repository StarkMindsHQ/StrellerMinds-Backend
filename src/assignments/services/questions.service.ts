import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../entities/question.entity';
import { CreateQuestionDto } from '../dto/create-question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
  ) {}

  async create(dto: CreateQuestionDto): Promise<Question> {
    const q = this.questionRepo.create(dto as any);
    return this.questionRepo.save(q);
  }

  async findOne(id: string): Promise<Question> {
    const q = await this.questionRepo.findOne({ where: { id }, relations: ['options'] });
    if (!q) throw new NotFoundException('Question not found');
    return q;
  }
}
