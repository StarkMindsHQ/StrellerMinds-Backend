import { IsEnum, IsString } from 'class-validator';
import { Language } from 'src/language/language.enum';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a new translation entry.
 */
export class CreateTranslationDto {
  /** Translation key */
  @ApiProperty({ description: 'Translation key', example: 'welcome_message' })
  @IsString()
  key: string;

  /** Language code */
  @ApiProperty({ description: 'Language code', enum: Language, example: Language.EN })
  @IsEnum(Language)
  language: Language;

  /** Translated value */
  @ApiProperty({ description: 'Translated value', example: 'Welcome!' })
  @IsString()
  value: string;
}
