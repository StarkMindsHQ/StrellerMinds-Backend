import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('files')
export class FileEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  ownerId: string;

  @Column()
  type: 'image' | 'video' | 'document';

  @Column()
  mimeType: string;

  @Column('bigint')
  size: number;

  @Column()
  path: string;

  @Column({ nullable: true })
  thumbnailPath: string;

  @Column({ default: 1 })
  version: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'clean', 'infected'],
    default: 'pending',
  })
  virusScanStatus: 'pending' | 'clean' | 'infected';

  @Column({ default: false })
  isPublic: boolean;

  @Column('simple-array', { nullable: true })
  sharedWith: string[]; // Array of User IDs

  @CreateDateColumn()
  createdAt: Date;
}
