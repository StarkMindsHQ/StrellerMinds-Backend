import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  key: string;

  @Column()
  owner: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}