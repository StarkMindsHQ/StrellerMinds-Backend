import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';
import { Language } from 'src/language/language.enum';

@Entity('translations')
@Index(['key', 'language'], { unique: true })
export class Translation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  key: string;

  @Column({
    type: 'enum',
    enum: Language,
  })
  language: Language;

  @Column()
  value: string;
}
