import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('chunk_uploads')
@Index(['uploadId', 'userId'])
export class ChunkUploadEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  uploadId: string;

  @Column()
  userId: string;

  @Column()
  filename: string;

  @Column()
  fileSize: number;

  @Column()
  mimeType: string;

  @Column()
  fileHash: string;

  @Column()
  chunkSize: number;

  @Column()
  totalChunks: number;

  @Column('simple-array', { default: [] })
  uploadedChunks: number[];

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ nullable: true })
  fileId?: string;

  @Column({ nullable: true })
  storageProvider?: string;

  @Column({ nullable: true })
  storagePath?: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  expiresAt: Date;
}
