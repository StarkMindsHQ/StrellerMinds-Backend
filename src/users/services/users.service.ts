import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { User } from '../entities/user.entity';
import { CreateUsersDto } from '../dtos/create.users.dto';
import { updateUsersDto } from '../dtos/update.users.dto';
import { EmailService } from 'src/email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly cloudinaryService: CloudinaryService,

    private readonly emailService: EmailService,

    private readonly configService: ConfigService,
  ) {}

  public async create(
    createUsersDto: CreateUsersDto,
    file?: Express.Multer.File,
  ): Promise<User> {
    try {
      const existingUser = await this.userRepo.findOne({
        where: { email: createUsersDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Handle image upload logic here
      if (file) {
        const uploadResult = await this.cloudinaryService.uploadImage(file);
        createUsersDto.profileImageUrl = uploadResult.secure_url;
      }

      // Create and save the user
      const user = this.userRepo.create(createUsersDto);
      return await this.userRepo.save(user);
    } catch (error) {
      throw new InternalServerErrorException('Error creating user');
    }
  }

  public async findAll(): Promise<User[]> {
    try {
      return await this.userRepo.find();
    } catch (error) {
      throw new InternalServerErrorException('Error fetching users');
    }
  }

  public async findOne(id: string): Promise<User> {
    try {
      const user = await this.userRepo.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      return user;
    } catch (error) {
      throw new InternalServerErrorException('Error fetching user');
    }
  }

  public async update(
    id: string,
    updateUserDto: updateUsersDto,
  ): Promise<User> {
    try {
      await this.findOne(id);
      await this.userRepo.update(id, updateUserDto);
      return await this.findOne(id);
    } catch (error) {
      throw new InternalServerErrorException('Error updating user');
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const result = await this.userRepo.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
    } catch (error) {
      throw new InternalServerErrorException('Error deleting user');
    }
  }

  public async requestAccountDeletion(userId: string): Promise<void> {
    try {
      const user = await this.findOne(userId); // reuse your findOne method

      // (Optional) Here you can generate a secure deletion token (we'll add this later)

      const confirmationUrl = `${this.configService.get<string>('FRONTEND_URL')}/confirm-deletion?userId=${user.id}`;
      const unsubscribeUrl = `${this.configService.get<string>('FRONTEND_URL')}/preferences?email=${user.email}`;

      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Confirm Your Account Deletion',
        templateName: 'account-deletion-confirmation',
        context: {
          name: user.firstName,
          confirmationUrl,
          companyName: 'YourCompanyName',
          unsubscribeUrl,
          year: new Date().getFullYear(),
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Error sending account deletion email',
      );
    }
  }

  public async findByEmail(email: string): Promise<User> {
    try {
      const user = await this.userRepo.findOne({ where: { email } });
      if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
      }
      return user;
    } catch (error) {
      throw new InternalServerErrorException('Error fetching user by email');
    }
  }

  public async updateRefreshToken(
    id: string,
    refreshToken: string | null,
  ): Promise<void> {
    try {
      await this.userRepo.update(id, { refreshToken });
    } catch (error) {
      throw new InternalServerErrorException('Error updating refresh token');
    }
  }

  public async findByUsername(username: string): Promise<User | undefined> {
    try {
      return await this.userRepo.findOne({ where: { username } });
    } catch (error) {
      throw new InternalServerErrorException('Error fetching user by username');
    }
  }
}
