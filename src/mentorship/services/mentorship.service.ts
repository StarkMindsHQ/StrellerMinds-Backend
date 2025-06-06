import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorshipPreference, UserRole } from '../entities/mentorship-preference.entity';
import { MentorshipMatch, MatchStatus, MatchType } from '../entities/mentorship-match.entity';
import { MentorAvailability } from '../entities/mentor-availability.entity';
import { CreatePreferenceDto } from '../dto/create-preference.dto';
import { CreateAvailabilityDto } from '../dto/create-availability.dto';
import { MatchRequestDto } from '../dto/match-request.dto';
import { UpdateMatchStatusDto } from '../dto/update-match-status.dto';
import { MatchingService } from './matching.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';

@Injectable()
export class MentorshipService {
  private readonly logger = new Logger(MentorshipService.name);

  constructor(
    @InjectRepository(MentorshipPreference)
    private readonly preferenceRepository: Repository<MentorshipPreference>,
    @InjectRepository(MentorshipMatch)
    private readonly matchRepository: Repository<MentorshipMatch>,
    @InjectRepository(MentorAvailability)
    private readonly availabilityRepository: Repository<MentorAvailability>,
    private readonly matchingService: MatchingService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create or update a user's mentorship preferences
   */
  async createOrUpdatePreference(
    userId: string,
    createPreferenceDto: CreatePreferenceDto,
  ): Promise<MentorshipPreference> {
    // Check if preference already exists
    let preference = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (preference) {
      // Update existing preference
      this.preferenceRepository.merge(preference, createPreferenceDto);
    } else {
      // Create new preference
      preference = this.preferenceRepository.create({
        userId,
        ...createPreferenceDto,
      });
    }

    return this.preferenceRepository.save(preference);
  }

  /**
   * Get a user's mentorship preferences
   */
  async getPreference(userId: string): Promise<MentorshipPreference> {
    const preference = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (!preference) {
      throw new NotFoundException(`Mentorship preference not found for user ${userId}`);
    }

    return preference;
  }

  /**
   * Create a new availability slot for a mentor
   */
  async createAvailability(
    mentorId: string,
    createAvailabilityDto: CreateAvailabilityDto,
  ): Promise<MentorAvailability> {
    // Verify user is a mentor
    const mentorPreference = await this.preferenceRepository.findOne({
      where: { userId: mentorId, role: UserRole.MENTOR },
    });

    if (!mentorPreference) {
      throw new BadRequestException(`User ${mentorId} is not registered as a mentor`);
    }

    // Create availability slot
    const availability = this.availabilityRepository.create({
      mentorId,
      startTime: new Date(createAvailabilityDto.startTime),
      endTime: new Date(createAvailabilityDto.endTime),
      recurrenceType: createAvailabilityDto.recurrenceType,
      recurrenceInterval: createAvailabilityDto.recurrenceInterval,
      recurrenceEndDate: createAvailabilityDto.recurrenceEndDate 
        ? new Date(createAvailabilityDto.recurrenceEndDate) 
        : null,
      isActive: createAvailabilityDto.isActive ?? true,
      notes: createAvailabilityDto.notes,
      durationMinutes: createAvailabilityDto.durationMinutes ?? 60,
      maxBookingsPerSlot: createAvailabilityDto.maxBookingsPerSlot ?? 1,
      additionalDetails: createAvailabilityDto.additionalDetails,
    });

    return this.availabilityRepository.save(availability);
  }

  /**
   * Get availability slots for a mentor
   */
  async getMentorAvailability(mentorId: string): Promise<MentorAvailability[]> {
    return this.availabilityRepository.find({
      where: { mentorId, isActive: true },
      order: { startTime: 'ASC' },
    });
  }

  /**
   * Create a mentorship match (manual or automatic)
   */
  async createMatch(userId: string, matchRequestDto: MatchRequestDto): Promise<MentorshipMatch | MentorshipMatch[]> {
    const { matchType = MatchType.AUTOMATIC } = matchRequestDto;

    if (matchType === MatchType.MANUAL) {
      return this.createManualMatch(userId, matchRequestDto);
    } else {
      return this.createAutomaticMatches(userId, matchRequestDto);
    }
  }

  /**
   * Create a manual match between specific mentor and mentee
   */
  private async createManualMatch(
    requesterId: string,
    matchRequestDto: MatchRequestDto,
  ): Promise<MentorshipMatch> {
    const { mentorId, menteeId } = matchRequestDto;

    if (!mentorId || !menteeId) {
      throw new BadRequestException('Both mentorId and menteeId are required for manual matching');
    }

    // Verify mentor and mentee exist and have the correct roles
    const mentorPreference = await this.preferenceRepository.findOne({
      where: { userId: mentorId, role: UserRole.MENTOR },
    });

    const menteePreference = await this.preferenceRepository.findOne({
      where: { userId: menteeId, role: UserRole.MENTEE },
    });

    if (!mentorPreference) {
      throw new BadRequestException(`User ${mentorId} is not registered as a mentor`);
    }

    if (!menteePreference) {
      throw new BadRequestException(`User ${menteeId} is not registered as a mentee`);
    }

    // Check if a match already exists between these users
    const existingMatch = await this.matchRepository.findOne({
      where: [
        { mentorId, menteeId, status: MatchStatus.PENDING },
        { mentorId, menteeId, status: MatchStatus.ACCEPTED },
      ],
    });

    if (existingMatch) {
      throw new BadRequestException(
        `A match already exists between mentor ${mentorId} and mentee ${menteeId} with status ${existingMatch.status}`,
      );
    }

    // Calculate compatibility score
    const compatibilityScore = await this.matchingService.calculateCompatibilityScore(
      menteePreference,
      mentorPreference,
    );

    // Create the match
    const match = this.matchRepository.create({
      mentorId,
      menteeId,
      status: MatchStatus.PENDING,
      matchType: MatchType.MANUAL,
      compatibilityScore: compatibilityScore.score,
      matchDetails: compatibilityScore.matchDetails,
    });

    const savedMatch = await this.matchRepository.save(match);

    // Send notifications to both users
    await this.sendMatchNotifications(savedMatch);

    return savedMatch;
  }

  /**
   * Create automatic matches for a user
   */
  private async createAutomaticMatches(
    userId: string,
    matchRequestDto: MatchRequestDto,
  ): Promise<MentorshipMatch[]> {
    const { limit = 5, minScore = 70, prioritySkills, priorityInterests } = matchRequestDto;

    // Get user's preference
    const userPreference = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (!userPreference) {
      throw new NotFoundException(`Mentorship preference not found for user ${userId}`);
    }

    // Determine if user is mentor or mentee
    if (userPreference.role === UserRole.MENTOR) {
      // Find matching mentees for this mentor
      const mentees = await this.matchingService.findActiveMentees();
      
      const matchingResult = await this.matchingService.findMatches(
        userPreference,
        mentees,
        {
          limit,
          minScore,
          prioritySkills,
          priorityInterests,
        },
      );

      // Create match records for each match
      const matches = await Promise.all(
        matchingResult.matches.map(async (match) => {
          const newMatch = this.matchRepository.create({
            mentorId: userId,
            menteeId: match.menteeId,
            status: MatchStatus.PENDING,
            matchType: MatchType.AUTOMATIC,
            compatibilityScore: match.score,
            matchDetails: match.matchDetails,
          });

          return this.matchRepository.save(newMatch);
        }),
      );

      // Send notifications for each match
      await Promise.all(matches.map(match => this.sendMatchNotifications(match)));

      return matches;
    } else {
      // Find matching mentors for this mentee
      const mentors = await this.matchingService.findActiveMentors();
      
      const matchingResult = await this.matchingService.findMatches(
        userPreference,
        mentors,
        {
          limit,
          minScore,
          prioritySkills,
          priorityInterests,
        },
      );

      // Create match records for each match
      const matches = await Promise.all(
        matchingResult.matches.map(async (match) => {
          const newMatch = this.matchRepository.create({
            mentorId: match.mentorId,
            menteeId: userId,
            status: MatchStatus.PENDING,
            matchType: MatchType.AUTOMATIC,
            compatibilityScore: match.score,
            matchDetails: match.matchDetails,
          });

          return this.matchRepository.save(newMatch);
        }),
      );

      // Send notifications for each match
      await Promise.all(matches.map(match => this.sendMatchNotifications(match)));

      return matches;
    }
  }

  /**
   * Update the status of a mentorship match
   */
  async updateMatchStatus(
    userId: string,
    matchId: string,
    updateMatchStatusDto: UpdateMatchStatusDto,
  ): Promise<MentorshipMatch> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    // Verify user is either the mentor or mentee in this match
    if (match.mentorId !== userId && match.menteeId !== userId) {
      throw new BadRequestException('You are not authorized to update this match');
    }

    // Update match status
    match.status = updateMatchStatusDto.status;

    // Update feedback based on who is updating the status
    if (userId === match.mentorId && updateMatchStatusDto.feedback) {
      match.mentorFeedback = updateMatchStatusDto.feedback;
    } else if (userId === match.menteeId && updateMatchStatusDto.feedback) {
      match.menteeFeedback = updateMatchStatusDto.feedback;
    }

    // If match is being accepted, set the start date
    if (updateMatchStatusDto.status === MatchStatus.ACCEPTED) {
      match.startDate = new Date();
    }

    // If match is being completed or canceled, set the end date
    if (
      updateMatchStatusDto.status === MatchStatus.COMPLETED ||
      updateMatchStatusDto.status === MatchStatus.CANCELED
    ) {
      match.endDate = new Date();
    }

    const updatedMatch = await this.matchRepository.save(match);

    // Send notification about the status update
    await this.sendStatusUpdateNotification(updatedMatch, userId);

    return updatedMatch;
  }

  /**
   * Get all matches for a user (as either mentor or mentee)
   */
  async getUserMatches(userId: string, status?: MatchStatus): Promise<MentorshipMatch[]> {
    const whereCondition: any = [
      { mentorId: userId },
      { menteeId: userId },
    ];

    if (status) {
      whereCondition[0].status = status;
      whereCondition[1].status = status;
    }

    return this.matchRepository.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a specific match by ID
   */
  async getMatchById(userId: string, matchId: string): Promise<MentorshipMatch> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    // Verify user is either the mentor or mentee in this match
    if (match.mentorId !== userId && match.menteeId !== userId) {
      throw new BadRequestException('You are not authorized to view this match');
    }

    return match;
  }

  /**
   * Send notifications for a new match
   */
  private async sendMatchNotifications(match: MentorshipMatch): Promise<void> {
    try {
      // Notify mentor
      await this.notificationsService.create({
        userId: match.mentorId,
        title: 'New Mentorship Match',
        content: `You have a new mentee match with compatibility score of ${match.compatibilityScore}%`,
        category: 'mentorship_match',
        metadata: { matchId: match.id },
        types: [NotificationType.IN_APP],
      });

      // Notify mentee
      await this.notificationsService.create({
        userId: match.menteeId,
        title: 'New Mentorship Match',
        content: `You have been matched with a mentor with compatibility score of ${match.compatibilityScore}%`,
        category: 'mentorship_match',
        metadata: { matchId: match.id },
        types: [NotificationType.IN_APP],
      });
    } catch (error) {
      this.logger.error(`Failed to send match notifications: ${error.message}`, error.stack);
      // Don't throw the error, as we don't want to fail the match creation if notifications fail
    }
  }

  /**
   * Send notification about a match status update
   */
  private async sendStatusUpdateNotification(
    match: MentorshipMatch,
    updatedByUserId: string,
  ): Promise<void> {
    try {
      // Determine recipient (the other user in the match)
      const recipientId = match.mentorId === updatedByUserId ? match.menteeId : match.mentorId;
      const role = match.mentorId === updatedByUserId ? 'Mentor' : 'Mentee';

      // Create message based on status
      let message = '';
      switch (match.status) {
        case MatchStatus.ACCEPTED:
          message = `${role} has accepted your mentorship match request`;
          break;
        case MatchStatus.DECLINED:
          message = `${role} has declined your mentorship match request`;
          break;
        case MatchStatus.COMPLETED:
          message = `${role} has marked your mentorship as completed`;
          break;
        case MatchStatus.CANCELED:
          message = `${role} has canceled your mentorship match`;
          break;
        default:
          message = `${role} has updated your mentorship match status to ${match.status}`;
      }

      // Send notification
      await this.notificationsService.create({
        userId: recipientId,
        title: 'Mentorship Status Update',
        content: message,
        category: 'mentorship_status_update',
        metadata: { matchId: match.id, status: match.status },
        types: [NotificationType.IN_APP],
      });
    } catch (error) {
      this.logger.error(`Failed to send status update notification: ${error.message}`, error.stack);
      // Don't throw the error, as we don't want to fail the status update if notification fails
    }
  }
}
