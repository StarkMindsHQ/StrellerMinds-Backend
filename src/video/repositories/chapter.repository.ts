import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Chapter } from '../entities/chapter.entity';

@Injectable()
export class ChapterRepository {
  constructor(
    @InjectRepository(Chapter)
    private readonly repository: Repository<Chapter>,
  ) {}

  // Example method to find a chapter by ID
  async findById(id: string): Promise<Chapter | null> {
    return this.repository.findOne({ where: { id } });
  }

  // Add other methods as needed
}
