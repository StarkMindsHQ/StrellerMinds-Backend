import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { FileEntity } from './file.entity';

@Entity('file_permissions')
export class FilePermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileId: string;

  @ManyToOne(() => FileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: FileEntity;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: ['READ', 'WRITE', 'DELETE', 'SHARE'],
    default: 'READ',
  })
  permission: 'READ' | 'WRITE' | 'DELETE' | 'SHARE';

  @Column({ nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
