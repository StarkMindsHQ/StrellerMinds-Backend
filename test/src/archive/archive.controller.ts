import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ArchiveService } from './services/archive.service';

@Controller('archive')
export class ArchiveController {
  constructor(private readonly archivingService: ArchiveService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  public async runAllArchiving() {
    await this.archivingService.archiveOldUsers();
    await this.archivingService.archiveOldUserProfiles();
    // await this.archivingService.archiveOldPayments();
    // await this.archivingService.archiveOldNotifications();
    return { message: ' Manual archiving completed successfully.' };
  }

  @Post('users')
  @HttpCode(HttpStatus.OK)
  async archiveUsers() {
    await this.archivingService.archiveOldUsers();
    return { message: ' Users archived.' };
  }

  @Post('profiles')
  @HttpCode(HttpStatus.OK)
  async archiveProfiles() {
    await this.archivingService.archiveOldUserProfiles();
    return { message: 'users-profiles archived.' };
  }

  // @Post('payments')
  // @HttpCode(HttpStatus.OK)
  // async archivePayments() {
  //   await this.archivingService.archiveOldPayments();
  //   return { message: ' Payments archived.' };
  // }

 
}
