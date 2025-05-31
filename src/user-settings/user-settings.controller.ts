import { Controller, Get, Put, Delete, Req, Body } from '@nestjs/common';
import { UserSettingsService } from './user-settings.service';
import { UpdateUserSettingDto } from './dto/update-user-setting.dto';

@Controller('user/settings')
export class UserSettingsController {
  constructor(private readonly service: UserSettingsService) {}

  @Get()
  async get(@Req() req) {
    return this.service.findByUser(req.user.id);
  }

  @Put()
  async update(@Req() req, @Body() dto: UpdateUserSettingDto) {
    return this.service.update(req.user.id, dto);
  }

  @Delete()
  async remove(@Req() req) {
    return this.service.delete(req.user.id);
  }
}
