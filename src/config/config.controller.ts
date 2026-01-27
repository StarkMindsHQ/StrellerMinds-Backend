import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ConfigurationService } from './config.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigurationService) {}

  @Get()
  findAll() {
    return this.configService.get('all');
  }

  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.configService.get(key);
  }

  @Post('secret')
  getSecret(@Body('secretName') secretName?: string) {
    return this.configService.getSecret(secretName);
  }

  @Get('feature/:flag')
  checkFeature(@Param('flag') flag: string) {
    return { enabled: this.configService.isFeatureEnabled(flag) };
  }
}
