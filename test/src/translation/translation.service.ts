import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Translation } from './translation.entity';
import { Repository } from 'typeorm';
import { CreateTranslationDto } from './translation.dto';
import { Language } from 'src/language/language.enum';

@Injectable()
export class TranslationService {
  constructor(
    @InjectRepository(Translation)
    private readonly translationRepo: Repository<Translation>,
  ) {}

  async getTranslation(key: string, language: Language): Promise<string> {
    const translation = await this.translationRepo.findOne({ where: { key, language } });
    if (!translation) {
      throw new NotFoundException(`Translation not found for key: ${key}, language: ${language}`);
    }
    return translation.value;
  }

  async createTranslation(dto: CreateTranslationDto) {
    const exists = await this.translationRepo.findOne({ where: { key: dto.key, language: dto.language } });
    if (exists) return exists;

    const newTranslation = this.translationRepo.create(dto);
    return await this.translationRepo.save(newTranslation);
  }

  async translateBatch(keys: string[], language: Language) {
    const translations = await this.translationRepo.find({
      where: keys.map((key) => ({ key, language })),
    });

    return keys.reduce((map, key) => {
      const found = translations.find(t => t.key === key);
      map[key] = found ? found.value : key; // fallback to key
      return map;
    }, {} as Record<string, string>);
  }
}
