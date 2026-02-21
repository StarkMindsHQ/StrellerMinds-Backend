import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum SdkLanguage {
  TYPESCRIPT = 'typescript',
  JAVASCRIPT = 'javascript',
  PYTHON = 'python',
  JAVA = 'java',
  PHP = 'php',
  RUBY = 'ruby',
  GO = 'go',
  RUST = 'rust',
}

export enum SdkStatus {
  GENERATING = 'generating',
  READY = 'ready',
  FAILED = 'failed',
}

@Entity('sdk_downloads')
@Index(['userId', 'language'])
@Index(['language', 'version'])
export class SdkDownload {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: SdkLanguage })
  language: SdkLanguage;

  @Column()
  version: string;

  @Column({ type: 'enum', enum: SdkStatus, default: SdkStatus.GENERATING })
  status: SdkStatus;

  @Column({ nullable: true })
  downloadUrl?: string;

  @Column({ nullable: true })
  filePath?: string;

  @Column({ type: 'bigint', nullable: true })
  fileSize?: number;

  @Column({ type: 'int', default: 0 })
  downloadCount: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    packageName?: string;
    repositoryUrl?: string;
    documentationUrl?: string;
    changelog?: string;
  };

  @Column({ nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  generatedAt?: Date;
}
