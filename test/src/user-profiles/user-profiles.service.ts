import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from './entities/user-profile.entity';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class UserProfilesService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    userId: string,
    createUserProfileDto: CreateUserProfileDto,
  ): Promise<UserProfile> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if profile already exists
    const existingProfile = await this.userProfileRepository.findOne({
      where: { userId },
    });

    if (existingProfile) {
      throw new ForbiddenException('User profile already exists');
    }

    const newProfile = this.userProfileRepository.create({
      ...createUserProfileDto,
      userId,
    });

    return this.userProfileRepository.save(newProfile);
  }

  async findAll(): Promise<UserProfile[]> {
    return this.userProfileRepository.find({
      where: { isPublic: true },
      select: [
        'id',
        'firstName',
        'lastName',
        'bio',
        'avatarUrl',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async findOne(id: string): Promise<UserProfile> {
    const profile = await this.userProfileRepository.findOne({ where: { id } });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return profile;
  }

  async findByUserId(
    userId: string,
    requestingUserId: string,
  ): Promise<UserProfile> {
    const profile = await this.userProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        `Profile for user with ID ${userId} not found`,
      );
    }

    // If profile is not public and the requesting user is not the owner
    if (!profile.isPublic && userId !== requestingUserId) {
      throw new ForbiddenException(
        'You do not have permission to view this profile',
      );
    }

    return profile;
  }

  async update(
    id: string,
    userId: string,
    updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<UserProfile> {
    const profile = await this.userProfileRepository.findOne({ where: { id } });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    // Check if the user is the owner of the profile
    if (profile.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this profile',
      );
    }

    await this.userProfileRepository.update(id, updateUserProfileDto);

    return this.userProfileRepository.findOne({ where: { id } });
  }

  async patch(
    id: string,
    userId: string,
    updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<UserProfile> {
    // Reusing the update method since both PUT and PATCH do the same in this case
    // TypeORM's update method only updates the fields that are provided
    return this.update(id, userId, updateUserProfileDto);
  }

  async remove(id: string, userId: string): Promise<void> {
    const profile = await this.userProfileRepository.findOne({ where: { id } });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    // Check if the user is the owner of the profile
    if (profile.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this profile',
      );
    }

    await this.userProfileRepository.delete(id);
  }

  async setPreferredLanguage(userId: string, lang: string): Promise<void> {
    const profile = await this.userProfileRepository.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }
  
    profile.preferredLanguage = lang;
    await this.userProfileRepository.save(profile);
  }

  
}
