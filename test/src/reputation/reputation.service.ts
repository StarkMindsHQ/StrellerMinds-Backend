/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReputationService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async awardPoints(userId: number, points: number) {
    const user = await this.userRepo.findOneBy({ id: userId.toString() });
    user.reputation += points;
    return this.userRepo.save(user);
  }
}
