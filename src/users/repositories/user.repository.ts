import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  // Add this method to find a user by email with password (for authentication)
  async findByEmailWithPassword(email: string): Promise<User | undefined> {
    return this.createQueryBuilder('user')
      .where('user.email = :email', { email })
      .addSelect('user.password') // Explicitly select password
      .getOne();
  }

  // Add this method to find a user by ID with relations
  async findByIdWithRelations(id: string): Promise<User | undefined> {
    return this.findOne({
      where: { id },
      relations: ['progress', 'walletInfo'],
    });
  }
}
