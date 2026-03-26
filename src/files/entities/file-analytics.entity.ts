import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FileEntity } from './file.entity';

@Entity('file_analytics')
export class FileAnalyticsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileId: string;

  @ManyToOne(() => FileEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fileId' })
  file: FileEntity;

  @Column({ nullable: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: ['VIEW', 'DOWNLOAD', 'UPLOAD', 'DELETE', 'SHARE'],
  })
  action: 'VIEW' | 'DOWNLOAD' | 'UPLOAD' | 'DELETE' | 'SHARE';

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column('jsonb', { nullable: true })
  metadata: any;
}
