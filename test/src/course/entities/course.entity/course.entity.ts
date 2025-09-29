import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Module } from '../module.entity/module.entity';

@Entity()
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  difficulty: string;

  @OneToMany(() => Module, (module) => module.course, {
    cascade: true,
    eager: true,
  })
  modules: Module[];
}
