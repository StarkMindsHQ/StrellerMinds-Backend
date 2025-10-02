import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column('text')
  description: string;

  @Column({ type: 'int', default: 0 })
  points: number;

  @CreateDateColumn()
  createdAt: Date;
}
