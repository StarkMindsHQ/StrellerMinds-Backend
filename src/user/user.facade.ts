import { Injectable } from '@nestjs/common';
import { IUserService } from '../common/interfaces/module-interfaces';
import { UserService } from './user.service';

@Injectable()
export class UserFacade implements IUserService {
  constructor(private readonly userService: UserService) {}

  async findById(id: string): Promise<any> {
    return this.userService.findOne(id);
  }

  async findByEmail(email: string): Promise<any> {
    return this.userService.findByEmail(email);
  }

  async updateProfile(id: string, data: any): Promise<any> {
    return this.userService.update(id, data);
  }
}
