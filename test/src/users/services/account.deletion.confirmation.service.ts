// // import { Injectable, Logger } from '@nestjs/common';
// // import { InjectRepository } from '@nestjs/typeorm';
// // import { Repository } from 'typeorm';
// // import { User } from '../entities/user.entity';
// // import { ConfigService } from '@nestjs/config';
// // import { randomBytes } from 'crypto';
// // import { EmailService } from 'src/email/email.service';




// // /**
// //  * Service to handle account deletion confirmation workflow
// //  */
// // @Injectable()
// // export class AccountDeletionConfirmationService {
// //   private readonly logger = new Logger(AccountDeletionConfirmationService.name);
// //   private readonly tokenExpirationTime: number; // in hours
// //   private readonly confirmationTokens: Map<
// //     string,
// //     { token: string; expires: Date }
// //   > = new Map();

// //   constructor(
// //     @InjectRepository(User)
// //     private readonly userRepository: Repository<User>,
// //     private readonly configService: ConfigService,
// //     private readonly emailService: EmailService,
// //   ) {
// //     this.tokenExpirationTime = this.configService.get<number>(
// //       'DELETION_TOKEN_EXPIRY_HOURS',
// //       24,
// //     );
// //   }

// //   /**
// //    * Start the deletion confirmation workflow
// //    * @param userId User ID requesting deletion
// //    */
// //   async startDeletionConfirmationWorkflow(userId: string): Promise<void> {
// //     const user = await this.userRepository.findOne({
// //       where: { id: userId },
// //     });

// //     if (!user) {
// //       this.logger.warn(
// //         `Attempted to start deletion workflow for non-existent user: ${userId}`,
// //       );
// //       return;
// //     }

// //     // Generate a secure random token
// //     const token = this.generateSecureToken();

// //     // Set expiration time
// //     const expiryTime = new Date();
// //     expiryTime.setHours(expiryTime.getHours() + this.tokenExpirationTime);

// //     // Store token with expiration
// //     this.confirmationTokens.set(userId, {
// //       token,
// //       expires: expiryTime,
// //     });

// //     // Send confirmation email
// //     await this.sendDeletionConfirmationEmail(user.email, token, expiryTime);

// //     this.logger.log(
// //       `Deletion confirmation workflow started for user ${userId}`,
// //     );
// //   }

// //   /**
// //    * Validate a deletion confirmation token
// //    * @param userId User ID
// //    * @param token Confirmation token to validate
// //    */
// //   async validateDeletionConfirmation(
// //     userId: string,
// //     token: string,
// //   ): Promise<boolean> {
// //     const storedToken = this.confirmationTokens.get(userId);

// //     // Check if token exists and is valid
// //     if (!storedToken) {
// //       this.logger.warn(`No deletion token found for user ${userId}`);
// //       return false;
// //     }

// //     // Check if token has expired
// //     if (new Date() > storedToken.expires) {
// //       this.logger.warn(`Deletion token for user ${userId} has expired`);
// //       this.confirmationTokens.delete(userId); // Clean up expired token
// //       return false;
// //     }

// //     // Check if token matches
// //     const isValid = storedToken.token === token;

// //     if (isValid) {
// //       // Remove the token after successful validation
// //       this.confirmationTokens.delete(userId);
// //       this.logger.log(`Deletion confirmation validated for user ${userId}`);
// //     } else {
// //       this.logger.warn(`Invalid deletion token provided for user ${userId}`);
// //     }

// //     return isValid;
// //   }

// //   /**
// //    * Generate a secure random token
// //    */
// //   private generateSecureToken(): string {
// //     return randomBytes(32).toString('hex');
// //   }

// //   /**
// //    * Send confirmation email with deletion token
// //    * @param email User's email address
// //    * @param token Confirmation token
// //    * @param expiryTime Token expiration time
// //    */
// //   private async sendDeletionConfirmationEmail(
// //     email: string,
// //     token: string,
// //     expiryTime: Date,
// //   ): Promise<void> {
// //     const subject = 'Confirm Your Account Deletion Request';

// //     const body = `
// //       <h2>Account Deletion Confirmation</h2>
// //       <p>We received a request to delete your account. If you didn't make this request, please ignore this email or contact support immediately.</p>
// //       <p>To confirm your account deletion, please click the link below:</p>
// //       <p><a href="${this.configService.get('FRONTEND_URL')}/account/confirm-deletion?token=${token}">Confirm Account Deletion</a></p>
// //       <p>This link will expire on ${expiryTime.toLocaleString()}.</p>
// //       <p>Please note that account deletion is permanent and cannot be undone. All your personal data will be removed according to our privacy policy.</p>
// //       <p>If you have any questions, please contact our support team.</p>
// //     `;

// //     try {
// //       // await this.emailService.sendEmail(email, subject, body);
// //       await this.emailService.sendEmail({
// //         to: email,
// //         subject,
// //         html:body
// //       });

// //       this.logger.log(`Deletion confirmation email sent to ${email}`);
// //     } catch (error) {
// //       this.logger.error(
// //         `Failed to send deletion confirmation email to ${email}`,
// //         error.stack,
// //       );
// //       throw error;
// //     }
// //   }
// // }

// import { Injectable, Logger } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { User } from '../entities/user.entity';
// import { ConfigService } from '@nestjs/config';
// import { randomBytes } from 'crypto';
// import { EmailService } from 'src/email/email.service';
// import { AccountStatus } from '../enums/accountStatus.enum';

// /**
//  * Service to handle account deletion confirmation workflow
//  */
// @Injectable()
// export class AccountDeletionConfirmationService {
//   private readonly logger = new Logger(AccountDeletionConfirmationService.name);
//   private readonly tokenExpirationTime: number; // in hours
//   private readonly confirmationTokens: Map<
//     string,
//     { token: string; expires: Date }
//   > = new Map();

//   constructor(
//     @InjectRepository(User)
//     private readonly userRepository: Repository<User>,
//     private readonly configService: ConfigService,
//     private readonly emailService: EmailService,
//   ) {
//     this.tokenExpirationTime = this.configService.get<number>(
//       'DELETION_TOKEN_EXPIRY_HOURS',
//       24,
//     );
//   }

//   /**
//    * Start the deletion confirmation workflow
//    * @param userId User ID requesting deletion
//    */
//   async startDeletionConfirmationWorkflow(userId: string): Promise<void> {
//     const user = await this.userRepository.findOne({
//       where: { id: userId },
//     });

//     if (!user) {
//       this.logger.warn(
//         `Attempted to start deletion workflow for non-existent user: ${userId}`,
//       );
//       return;
//     }

//     const token = this.generateSecureToken();

//     const expiryTime = new Date();
//     expiryTime.setHours(expiryTime.getHours() + this.tokenExpirationTime);

//     this.confirmationTokens.set(userId, {
//       token,
//       expires: expiryTime,
//     });

//     await this.sendDeletionConfirmationEmail(user.email, token, expiryTime);

//     this.logger.log(
//       `Deletion confirmation workflow started for user ${userId}`,
//     );
//   }

//   /**
//    * Validate a deletion confirmation token and scrub user
//    * @param userId User ID
//    * @param token Confirmation token to validate
//    */
//   async validateAndDeleteAccount(
//     userId: string,
//     token: string,
//   ): Promise<boolean> {
//     const storedToken = this.confirmationTokens.get(userId);

//     if (!storedToken) {
//       this.logger.warn(`No deletion token found for user ${userId}`);
//       return false;
//     }

//     if (new Date() > storedToken.expires) {
//       this.logger.warn(`Deletion token for user ${userId} has expired`);
//       this.confirmationTokens.delete(userId);
//       return false;
//     }

//     if (storedToken.token !== token) {
//       this.logger.warn(`Invalid deletion token provided for user ${userId}`);
//       return false;
//     }

//     const user = await this.userRepository.findOne({
//       where: { id: userId },
//     });

//     if (!user) {
//       this.logger.warn(
//         `User not found during deletion confirmation: ${userId}`,
//       );
//       return false;
//     }

//     // Scrub sensitive data
//     user.firstName = 'Deleted';
//     user.lastName = 'User';
//     user.email = `${user.id}@deleted.example.com`; // anonymize email
//     user.bio = null;
//     user.profileImageUrl = null;
//     user.status = AccountStatus.DELETED;
//     user.deactivatedAt = new Date();
//     user.deletionRequestedAt = new Date();
//     user.deletedAt = new Date();

//     await this.userRepository.save(user);

//     // Clean up token
//     this.confirmationTokens.delete(userId);

//     this.logger.log(`User ${userId} account deletion confirmed and scrubbed`);
//     return true;
//   }

//   /**
//    * Generate a secure random token
//    */
//   private generateSecureToken(): string {
//     return randomBytes(32).toString('hex');
//   }

//   /**
//    * Send confirmation email with deletion token
//    */
//   private async sendDeletionConfirmationEmail(
//     email: string,
//     token: string,
//     expiryTime: Date,
//   ): Promise<void> {
//     const subject = 'Confirm Your Account Deletion Request';
//     const body = `
//       <h2>Account Deletion Confirmation</h2>
//       <p>We received a request to delete your account. If you didn't make this request, please ignore this email or contact support immediately.</p>
//       <p>To confirm your account deletion, please click the link below:</p>
//       <p><a href="${this.configService.get('FRONTEND_URL')}/account/confirm-deletion?token=${token}">Confirm Account Deletion</a></p>
//       <p>This link will expire on ${expiryTime.toLocaleString()}.</p>
//       <p>Please note that account deletion is permanent and cannot be undone. All your personal data will be removed according to our privacy policy.</p>
//       <p>If you have any questions, please contact our support team.</p>
//     `;

//     try {
     
//       // await this.emailService.sendEmail({
//       //   to: user.email,
//       //   subject: 'Confirm Your Account Deletion',
//       //   templateName: 'account-deletion-confirmation', 
//       //   context: {
//       //     name: user.firstName,
//       //     confirmationUrl,
//       //     companyName: 'YourCompanyName', // customize if needed
//       //     unsubscribeUrl,
//       //     year: new Date().getFullYear(),
//       //   },
//       //   html: body,

//       await this.emailService.sendEmail({
//       to: email,
//       subject: 'Confirm Your Account Deletion',
//       templateName: 'account-deletion-confirmation',
//       context: {
//         name: user.firstName,
//         confirmationUrl,
//         companyName: 'YourCompanyName',
//         unsubscribeUrl,
//         year: new Date().getFullYear(),
//       },
//     });
//       });

//       this.logger.log(`Deletion confirmation email sent to ${email}`);
//     } catch (error) {
//       this.logger.error(
//         `Failed to send deletion confirmation email to ${email}`,
//         error.stack,
//       );
//       throw error;
//     }
//   }
// }



import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class AccountDeletionConfirmationService {
  constructor(private readonly emailService: EmailService) {}

  async sendAccountDeletionEmail({
    email,
    firstName,
    confirmationUrl,
    unsubscribeUrl,
  }: {
    email: string;
    firstName: string;
    confirmationUrl: string;
    unsubscribeUrl: string;
  }) {
    await this.emailService.sendEmail({
      to: email,
      subject: 'Confirm Your Account Deletion',
      templateName: 'account-deletion-confirmation',
      context: {
        name: firstName,
        confirmationUrl,
        companyName: 'YourCompanyName', // You can make this dynamic too
        unsubscribeUrl,
        year: new Date().getFullYear(),
      },
    });
  }

   async validateAndDeleteAccount(token: string): Promise<boolean> {
    // Your validation and deletion logic here
    return true; // or false
  }
}

