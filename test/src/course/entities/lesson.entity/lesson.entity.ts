import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Module } from '../module.entity/module.entity';

@Entity()
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  content: string;

  @ManyToOne(() => Module, (module) => module.lessons)
  module: Module;
}
