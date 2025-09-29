import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('rewards')
export class Reward {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column('text')
  description: string;

  @Column()
  type: string; 

  @Column('int')
  value: number;

  @CreateDateColumn()
  createdAt: Date;
} 