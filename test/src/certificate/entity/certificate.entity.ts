/**
 * Certificate entity representing issued certificates.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Course } from '../../courses/entities/course.entity';
import { User } from '../../users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('certificates')
export class Certificate {
  @ApiProperty({ description: 'Certificate ID', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Certificate number', example: 'CERT-2025-001' })
  @Column()
  certificateNumber: string;

  @ApiProperty({ description: 'Issue date', example: '2025-06-29' })
  @Column({ type: 'date' })
  issueDate: Date;

  @ApiPropertyOptional({ description: 'PDF URL', example: 'https://cdn.com/cert.pdf' })
  @Column({ nullable: true })
  pdfUrl: string;

  @ApiProperty({ description: 'Date created', example: '2025-06-29T12:00:00Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'User', type: () => User })
  @ManyToOne(() => User, (user) => user.id, { nullable: false })
  @Index()
  user: Promise<User>;

  @ApiProperty({ description: 'Course', type: () => Course })
  @ManyToOne(() => Course, (course) => course.certificates, { nullable: false })
  @Index()
  course: Promise<Course>;
}
