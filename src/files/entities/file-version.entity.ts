import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { FileEntity } from './file.entity';

@Entity('file_versions')
export class FileVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileId: string;

  @ManyToOne(() => FileEntity, (file) => file.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: FileEntity;

  @Column()
  versionNumber: number;

  @Column()
  path: string;

  @Column({ nullable: true })
  versionId: string; // Cloud provider version reference

  @Column('bigint')
  size: number;

  @Column()
  mimeType: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column('jsonb', { nullable: true })
  metadata: any;
}
