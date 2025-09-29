import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('rate_limiter')
export class RateLimiterEntity {
  @PrimaryColumn()
  key: string;

  @Column()
  points: number;

  @Column()
  expire: Date;
}
