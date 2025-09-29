import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ArchivedUser } from '../../users/entities/archived-user.entity';
import { UserProfile } from '../../user-profiles/entities/user-profile.entity';
import { ArchivedUserProfile } from '../../user-profiles/entities/archived-user-profile.entity';
import { ArchivedPayment } from '../../payment/entities/archived-payment.entity';
import { ArchivedNotification } from '../../notification/entities/archived-notification.entity';

@Injectable()
export class ArchiveService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(ArchivedUser)
    private archivedUserRepo: Repository<ArchivedUser>,

    @InjectRepository(UserProfile)
    private profileRepo: Repository<UserProfile>,

    @InjectRepository(ArchivedUserProfile)
    private archivedProfileRepo: Repository<ArchivedUserProfile>,

    

    @InjectRepository(ArchivedPayment)
    private archivedPaymentRepo: Repository<ArchivedPayment>,

    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,

    @InjectRepository(ArchivedNotification)
    private archivedNotificationRepo: Repository<ArchivedNotification>,
  ) {}

  // _______________________ Archive Users ________________________________________

  public async archiveOldUsers(): Promise<void> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const oldUsers = await this.userRepo.find({
      where: { createdAt: LessThan(oneYearAgo) },
    });

    const archived = oldUsers.map((user) => {
      const archivedUser = new ArchivedUser();
      Object.assign(archivedUser, user);
      archivedUser.archivedAt = new Date();
      return archivedUser;
    });

    await this.archivedUserRepo.save(archived);
    await this.userRepo.remove(oldUsers);
  }

  //______________________________________ Archive UserProfiles ____________________________________

  public async archiveOldUserProfiles(): Promise<void> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const oldProfiles = await this.profileRepo.find({
      where: { createdAt: LessThan(oneYearAgo) },
    });

    const archived = oldProfiles.map((profile) => {
      const archivedProfile = new ArchivedUserProfile();
      Object.assign(archivedProfile, profile);
      archivedProfile.archivedAt = new Date();
      return archivedProfile;
    });

    await this.archivedProfileRepo.save(archived);
    await this.profileRepo.remove(oldProfiles);
  }

  // __________________________________ Archive Payments _____________________________________

  // public async archiveOldPayments(): Promise<void> {
  //   const sixMonthsAgo = new Date();
  //   sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  //   const oldPayments = await this.paymentRepo.find({
  //     where: { createdAt: LessThan(sixMonthsAgo) },
  //   });

  //   const archived = oldPayments.map((payment) => {
  //     const archivedPayment = new ArchivedPayment();
  //     Object.assign(archivedPayment, payment);
  //     archivedPayment.archivedAt = new Date();
  //     return archivedPayment;
  //   });

  //   await this.archivedPaymentRepo.save(archived);
  //   await this.paymentRepo.remove(oldPayments);
  // }

  //_____________________________________   Archive Notifications _____________________________

  // public async archiveOldNotifications(): Promise<void> {
  //   const sixMonthsAgo = new Date();
  //   sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  //   const oldNotifications = await this.notificationRepo.find({
  //     where: { createdAt: LessThan(sixMonthsAgo) },
  //   });

  //   const archived = oldNotifications.map((notification) => {
  //     const archivedNotification = new ArchivedNotification();
  //     Object.assign(archivedNotification, notification);
  //     archivedNotification.archivedAt = new Date();
  //     return archivedNotification;
  //   });

  //   await this.archivedNotificationRepo.save(archived);
  //   await this.notificationRepo.remove(oldNotifications);
  // }
}
