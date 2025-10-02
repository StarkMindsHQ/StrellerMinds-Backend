import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { CreateTranslationDto } from './translation.dto';
import { Language } from 'src/language/language.enum';

@Controller('translations')
export class TranslationController {
  constructor(private readonly service: TranslationService) {}

  @Post()
  async create(@Body() dto: CreateTranslationDto) {
    return await this.service.createTranslation(dto);
  }

  @Get()
  async get(@Query('key') key: string, @Query('lang') lang: Language) {
    return await this.service.getTranslation(key, lang);
  }

  @Get('batch')
  async getBatch(@Query('keys') keys: string[], @Query('lang') lang: Language) {
    return await this.service.translateBatch(keys, lang);
  }
}
