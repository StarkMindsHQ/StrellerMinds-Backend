import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserSettingDto, UpdateUserSettingDto } from './dto';
import { UserSetting } from './entities/user-setting.entity';

@Injectable()
export class UserSettingsService {
  constructor(
    @InjectRepository(UserSetting)
    private repo: Repository<UserSetting>,
  ) {}

  async findByUser(userId: string): Promise<UserSetting> {
    const setting = await this.repo.findOne({ where: { userId } });
    if (!setting) throw new NotFoundException('Settings not found');
    return setting;
  }

  async createOrGet(dto: CreateUserSettingDto): Promise<UserSetting> {
    let setting = await this.repo.findOne({ where: { userId: dto.userId } });
    if (!setting) {
      setting = this.repo.create(dto);
      await this.repo.save(setting);
    }
    return setting;
  }

  async update(userId: string, dto: UpdateUserSettingDto) {
    const setting = await this.findByUser(userId);
    Object.assign(setting, dto);
    return this.repo.save(setting);
  }

  async delete(userId: string) {
    const setting = await this.findByUser(userId);
    return this.repo.remove(setting);
  }
}
