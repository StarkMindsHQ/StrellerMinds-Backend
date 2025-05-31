import { PartialType } from '@nestjs/mapped-types';
import { CreateUserSettingDto } from './create-user-setting.dto';

export class UpdateUserSettingDto extends PartialType(CreateUserSettingDto) {}
