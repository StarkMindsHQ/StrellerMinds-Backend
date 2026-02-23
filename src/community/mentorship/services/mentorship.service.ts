import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorProfile } from '../entities/mentor-profile.entity';
import { Mentorship, MentorshipStatus } from '../entities/mentorship.entity';
import { MentorshipSession } from '../entities/mentorship-session.entity';

@Injectable()
export class MentorshipService {
  constructor(
    @InjectRepository(MentorProfile)
    private mentorProfileRepo: Repository<MentorProfile>,
    @InjectRepository(Mentorship)
    private mentorshipRepo: Repository<Mentorship>,
    @InjectRepository(MentorshipSession)
    private sessionRepo: Repository<MentorshipSession>,
  ) {}

  async registerMentor(userId: string, profileData: Partial<MentorProfile>): Promise<MentorProfile> {
    const existing = await this.mentorProfileRepo.findOne({ where: { userId } });
    if (existing) {
      throw new BadRequestException('User is already registered as a mentor');
    }

    const profile = this.mentorProfileRepo.create({
      userId,
      ...profileData,
    });

    return await this.mentorProfileRepo.save(profile);
  }

  async updateMentorProfile(userId: string, updateData: Partial<MentorProfile>): Promise<MentorProfile> {
    const profile = await this.mentorProfileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Mentor profile not found');
    }

    Object.assign(profile, updateData);
    return await this.mentorProfileRepo.save(profile);
  }

  async findMentors(filters?: {
    expertise?: string[];
    availability?: boolean;
    minRating?: number;
  }): Promise<MentorProfile[]> {
    const query = this.mentorProfileRepo
      .createQueryBuilder('mentor')
      .where('mentor.isActive = :isActive', { isActive: true });

    if (filters?.availability) {
      query.andWhere('mentor.isAvailable = :isAvailable', { isAvailable: true });
      query.andWhere('mentor.currentMentees < mentor.maxMentees');
    }

    if (filters?.minRating) {
      query.andWhere('mentor.averageRating >= :minRating', { minRating: filters.minRating });
    }

    if (filters?.expertise && filters.expertise.length > 0) {
      query.andWhere('mentor.expertise && :expertise', { expertise: filters.expertise });
    }

    return await query
      .orderBy('mentor.averageRating', 'DESC')
      .addOrderBy('mentor.totalMentorships', 'DESC')
      .getMany();
  }

  async requestMentorship(menteeId: string, mentorId: string, requestData: any): Promise<Mentorship> {
    if (menteeId === mentorId) {
      throw new BadRequestException('Cannot request mentorship from yourself');
    }

    const mentor = await this.mentorProfileRepo.findOne({ where: { userId: mentorId } });
    if (!mentor) {
      throw new NotFoundException('Mentor not found');
    }

    if (!mentor.isAvailable || mentor.currentMentees >= mentor.maxMentees) {
      throw new BadRequestException('Mentor is not available');
    }

    const existing = await this.mentorshipRepo.findOne({
      where: {
        mentorId,
        menteeId,
        status: MentorshipStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new BadRequestException('Active mentorship already exists');
    }

    const mentorship = this.mentorshipRepo.create({
      mentorId,
      menteeId,
      ...requestData,
      status: MentorshipStatus.PENDING,
    });

    return await this.mentorshipRepo.save(mentorship);
  }

  async approveMentorship(mentorshipId: string, mentorId: string): Promise<Mentorship> {
    const mentorship = await this.mentorshipRepo.findOne({
      where: { id: mentorshipId, mentorId },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship request not found');
    }

    if (mentorship.status !== MentorshipStatus.PENDING) {
      throw new BadRequestException('Mentorship is not in pending status');
    }

    mentorship.status = MentorshipStatus.ACTIVE;
    mentorship.startDate = new Date();

    const saved = await this.mentorshipRepo.save(mentorship);

    // Update mentor's current mentees count
    await this.mentorProfileRepo.increment(
      { userId: mentorId },
      'currentMentees',
      1,
    );

    return saved;
  }

  async rejectMentorship(mentorshipId: string, mentorId: string, reason?: string): Promise<void> {
    const mentorship = await this.mentorshipRepo.findOne({
      where: { id: mentorshipId, mentorId },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship request not found');
    }

    mentorship.status = MentorshipStatus.REJECTED;
    mentorship.notes = reason || mentorship.notes;
    await this.mentorshipRepo.save(mentorship);
  }

  async completeMentorship(mentorshipId: string, userId: string, feedback?: any): Promise<Mentorship> {
    const mentorship = await this.mentorshipRepo.findOne({
      where: { id: mentorshipId },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
    }

    if (mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
      throw new BadRequestException('Not authorized to complete this mentorship');
    }

    mentorship.status = MentorshipStatus.COMPLETED;
    mentorship.endDate = new Date();

    if (feedback) {
      if (userId === mentorship.mentorId) {
        mentorship.menteeRating = feedback.rating;
      } else {
        mentorship.mentorRating = feedback.rating;
      }
      mentorship.feedback = feedback.comment;
    }

    const saved = await this.mentorshipRepo.save(mentorship);

    // Update mentor stats
    await this.mentorProfileRepo.decrement(
      { userId: mentorship.mentorId },
      'currentMentees',
      1,
    );
    await this.mentorProfileRepo.increment(
      { userId: mentorship.mentorId },
      'completedMentorships',
      1,
    );

    // Update mentor rating if provided
    if (mentorship.mentorRating) {
      await this.updateMentorRating(mentorship.mentorId, mentorship.mentorRating);
    }

    return saved;
  }

  async logSession(mentorshipId: string, sessionData: Partial<MentorshipSession>): Promise<MentorshipSession> {
    const mentorship = await this.mentorshipRepo.findOne({
      where: { id: mentorshipId },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
    }

    const session = this.sessionRepo.create({
      mentorshipId,
      ...sessionData,
    });

    const saved = await this.sessionRepo.save(session);

    // Update mentorship sessions count
    await this.mentorshipRepo.increment(
      { id: mentorshipId },
      'sessionsCompleted',
      1,
    );

    return saved;
  }

  async getMentorshipSessions(mentorshipId: string): Promise<MentorshipSession[]> {
    return await this.sessionRepo.find({
      where: { mentorshipId },
      order: { scheduledAt: 'DESC' },
    });
  }

  async getUserMentorships(userId: string, role?: 'mentor' | 'mentee'): Promise<Mentorship[]> {
    const query = this.mentorshipRepo.createQueryBuilder('mentorship');

    if (role === 'mentor') {
      query.where('mentorship.mentorId = :userId', { userId });
    } else if (role === 'mentee') {
      query.where('mentorship.menteeId = :userId', { userId });
    } else {
      query.where('mentorship.mentorId = :userId OR mentorship.menteeId = :userId', { userId });
    }

    return await query
      .leftJoinAndSelect('mentorship.mentor', 'mentor')
      .leftJoinAndSelect('mentorship.mentee', 'mentee')
      .orderBy('mentorship.createdAt', 'DESC')
      .getMany();
  }

  private async updateMentorRating(mentorId: string, newRating: number): Promise<void> {
    const profile = await this.mentorProfileRepo.findOne({ where: { userId: mentorId } });
    if (!profile) return;

    const totalRatings = profile.totalRatings + 1;
    const currentTotal = profile.averageRating * profile.totalRatings;
    const newAverage = (currentTotal + newRating) / totalRatings;

    profile.averageRating = Math.round(newAverage * 100) / 100;
    profile.totalRatings = totalRatings;

    await this.mentorProfileRepo.save(profile);
  }

  async matchMentors(menteeId: string, preferences: {
    expertise: string[];
    goals: string[];
  }): Promise<MentorProfile[]> {
    // Simple matching algorithm based on expertise overlap
    const mentors = await this.findMentors({
      expertise: preferences.expertise,
      availability: true,
      minRating: 3.0,
    });

    // Score mentors based on expertise match
    const scoredMentors = mentors.map(mentor => {
      const expertiseMatch = mentor.expertise.filter(exp =>
        preferences.expertise.includes(exp)
      ).length;

      return {
        mentor,
        score: expertiseMatch * 10 + mentor.averageRating * 2 + mentor.completedMentorships * 0.5,
      };
    });

    // Sort by score and return top matches
    return scoredMentors
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.mentor);
  }
}
