import { IsIn } from 'class-validator';

export class VoteDto {
  @IsIn(['up', 'down'])
  vote: 'up' | 'down';
}
