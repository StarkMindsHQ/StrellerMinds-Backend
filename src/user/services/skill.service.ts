import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Skill } from '../entities/skill.entity';
import { UserSkill } from '../entities/user-skill.entity';
import { SkillEndorsement } from '../entities/skill-endorsement.entity';
import { SkillAssessment } from '../entities/skill-assessment.entity';
import { SkillAssessmentResult } from '../entities/skill-assessment-result.entity';
import { UserProfile } from '../entities/user-profile.entity';
import {
  CreateSkillDto,
  UpdateSkillDto,
  SkillResponseDto,
  CreateUserSkillDto,
  UpdateUserSkillDto,
  UserSkillResponseDto,
  CreateSkillEndorsementDto,
  SkillEndorsementResponseDto,
  CreateSkillAssessmentDto,
  SkillAssessmentResponseDto,
  SubmitAssessmentDto,
  AssessmentResultResponseDto,
  SkillSearchResponseDto,
  UserSkillStatsDto,
} from '../dto/skill.dto';

@Injectable()
export class SkillService {
  constructor(
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    @InjectRepository(UserSkill)
    private userSkillRepository: Repository<UserSkill>,
    @InjectRepository(SkillEndorsement)
    private endorsementRepository: Repository<SkillEndorsement>,
    @InjectRepository(SkillAssessment)
    private assessmentRepository: Repository<SkillAssessment>,
    @InjectRepository(SkillAssessmentResult)
    private assessmentResultRepository: Repository<SkillAssessmentResult>,
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
  ) {}

  // Skill Management
  async createSkill(createDto: CreateSkillDto): Promise<SkillResponseDto> {
    const skill = this.skillRepository.create(createDto);
    const saved = await this.skillRepository.save(skill);
    return this.mapSkillToResponseDto(saved);
  }

  async getAllSkills(
    category?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<SkillSearchResponseDto> {
    const query = this.skillRepository.createQueryBuilder('skill')
      .where('skill.isActive = :isActive', { isActive: true });

    if (category) {
      query.andWhere('skill.category = :category', { category });
    }

    const [skills, total] = await query
      .orderBy('skill.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      skills: skills.map((s) => this.mapSkillToResponseDto(s)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async searchSkills(query: string, page: number = 1, limit: number = 20): Promise<SkillSearchResponseDto> {
    const [skills, total] = await this.skillRepository.findAndCount({
      where: [
        { name: Like(`%${query}%`), isActive: true },
        { description: Like(`%${query}%`), isActive: true },
      ],
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      skills: skills.map((s) => this.mapSkillToResponseDto(s)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSkillById(skillId: string): Promise<SkillResponseDto> {
    const skill = await this.skillRepository.findOne({
      where: { id: skillId },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    return this.mapSkillToResponseDto(skill);
  }

  async updateSkill(skillId: string, updateDto: UpdateSkillDto): Promise<SkillResponseDto> {
    const skill = await this.skillRepository.findOne({
      where: { id: skillId },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    Object.assign(skill, updateDto);
    const saved = await this.skillRepository.save(skill);
    return this.mapSkillToResponseDto(saved);
  }

  async deleteSkill(skillId: string): Promise<void> {
    const skill = await this.skillRepository.findOne({
      where: { id: skillId },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    skill.isActive = false;
    await this.skillRepository.save(skill);
  }

  // User Skill Management
  async addUserSkill(profileId: string, createDto: CreateUserSkillDto): Promise<UserSkillResponseDto> {
    const skill = await this.skillRepository.findOne({
      where: { id: createDto.skillId },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    // Check if user already has this skill
    const existing = await this.userSkillRepository.findOne({
      where: { profileId, skillId: createDto.skillId },
    });

    if (existing) {
      throw new BadRequestException('User already has this skill');
    }

    const userSkill = this.userSkillRepository.create({
      ...createDto,
      profileId,
    });

    const saved = await this.userSkillRepository.save(userSkill);

    // Update skill user count
    skill.userCount++;
    await this.skillRepository.save(skill);

    return this.mapUserSkillToResponseDto(saved, skill);
  }

  async getUserSkills(profileId: string, includePrivate: boolean = false): Promise<UserSkillResponseDto[]> {
    const query = this.userSkillRepository.createQueryBuilder('userSkill')
      .leftJoinAndSelect('userSkill.skill', 'skill')
      .where('userSkill.profileId = :profileId', { profileId });

    if (!includePrivate) {
      query.andWhere('userSkill.isPublic = :isPublic', { isPublic: true });
    }

    const userSkills = await query
      .orderBy('userSkill.proficiencyLevel', 'DESC')
      .addOrderBy('userSkill.endorsementCount', 'DESC')
      .getMany();

    return userSkills.map((us) => this.mapUserSkillToResponseDto(us, us.skill));
  }

  async updateUserSkill(
    userSkillId: string,
    profileId: string,
    updateDto: UpdateUserSkillDto,
  ): Promise<UserSkillResponseDto> {
    const userSkill = await this.userSkillRepository.findOne({
      where: { id: userSkillId, profileId },
      relations: ['skill'],
    });

    if (!userSkill) {
      throw new NotFoundException('User skill not found');
    }

    Object.assign(userSkill, updateDto);
    const saved = await this.userSkillRepository.save(userSkill);
    return this.mapUserSkillToResponseDto(saved, saved.skill);
  }

  async removeUserSkill(userSkillId: string, profileId: string): Promise<void> {
    const userSkill = await this.userSkillRepository.findOne({
      where: { id: userSkillId, profileId },
      relations: ['skill'],
    });

    if (!userSkill) {
      throw new NotFoundException('User skill not found');
    }

    await this.userSkillRepository.remove(userSkill);

    // Update skill user count
    if (userSkill.skill) {
      userSkill.skill.userCount = Math.max(0, userSkill.skill.userCount - 1);
      await this.skillRepository.save(userSkill.skill);
    }
  }

  // Skill Endorsements
  async createEndorsement(
    endorserId: string,
    createDto: CreateSkillEndorsementDto,
  ): Promise<SkillEndorsementResponseDto> {
    const userSkill = await this.userSkillRepository.findOne({
      where: { id: createDto.userSkillId },
      relations: ['profile', 'skill'],
    });

    if (!userSkill) {
      throw new NotFoundException('User skill not found');
    }

    // Prevent self-endorsement
    if (userSkill.profileId === endorserId) {
      throw new BadRequestException('Cannot endorse your own skill');
    }

    // Check if already endorsed
    const existing = await this.endorsementRepository.findOne({
      where: { userSkillId: createDto.userSkillId, endorserId },
    });

    if (existing) {
      throw new BadRequestException('Already endorsed this skill');
    }

    const endorsement = this.endorsementRepository.create({
      ...createDto,
      endorserId,
    });

    const saved = await this.endorsementRepository.save(endorsement);

    // Update endorsement counts
    userSkill.endorsementCount++;
    await this.userSkillRepository.save(userSkill);

    userSkill.skill.totalEndorsements++;
    await this.skillRepository.save(userSkill.skill);

    const endorser = await this.profileRepository.findOne({
      where: { id: endorserId },
      relations: ['user'],
    });

    return this.mapEndorsementToResponseDto(saved, endorser);
  }

  async getSkillEndorsements(userSkillId: string): Promise<SkillEndorsementResponseDto[]> {
    const endorsements = await this.endorsementRepository.find({
      where: { userSkillId },
      relations: ['endorser', 'endorser.user'],
      order: { createdAt: 'DESC' },
    });

    return endorsements.map((e) => this.mapEndorsementToResponseDto(e, e.endorser));
  }

  async removeEndorsement(endorsementId: string, endorserId: string): Promise<void> {
    const endorsement = await this.endorsementRepository.findOne({
      where: { id: endorsementId, endorserId },
      relations: ['userSkill', 'userSkill.skill'],
    });

    if (!endorsement) {
      throw new NotFoundException('Endorsement not found');
    }

    await this.endorsementRepository.remove(endorsement);

    // Update endorsement counts
    const userSkill = endorsement.userSkill;
    userSkill.endorsementCount = Math.max(0, userSkill.endorsementCount - 1);
    await this.userSkillRepository.save(userSkill);

    userSkill.skill.totalEndorsements = Math.max(0, userSkill.skill.totalEndorsements - 1);
    await this.skillRepository.save(userSkill.skill);
  }

  // Skill Assessments
  async createAssessment(createDto: CreateSkillAssessmentDto): Promise<SkillAssessmentResponseDto> {
    const skill = await this.skillRepository.findOne({
      where: { id: createDto.skillId },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    const assessment = this.assessmentRepository.create(createDto);
    const saved = await this.assessmentRepository.save(assessment);

    return this.mapAssessmentToResponseDto(saved, skill);
  }

  async getAssessmentsBySkill(skillId: string): Promise<SkillAssessmentResponseDto[]> {
    const skill = await this.skillRepository.findOne({
      where: { id: skillId },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    const assessments = await this.assessmentRepository.find({
      where: { skillId, isActive: true },
      order: { difficultyLevel: 'ASC' },
    });

    return assessments.map((a) => this.mapAssessmentToResponseDto(a, skill));
  }

  async getAssessmentById(assessmentId: string): Promise<SkillAssessmentResponseDto> {
    const assessment = await this.assessmentRepository.findOne({
      where: { id: assessmentId },
      relations: ['skill'],
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    return this.mapAssessmentToResponseDto(assessment, assessment.skill);
  }

  async submitAssessment(
    profileId: string,
    submitDto: SubmitAssessmentDto,
  ): Promise<AssessmentResultResponseDto> {
    const assessment = await this.assessmentRepository.findOne({
      where: { id: submitDto.assessmentId },
      relations: ['skill'],
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    // Calculate score
    let correctAnswers = 0;
    let totalPoints = 0;
    const answerResults = submitDto.answers.map((answer) => {
      const question = assessment.questions.find((q) => q.id === answer.questionId);
      if (!question) {
        throw new BadRequestException(`Question ${answer.questionId} not found`);
      }

      const isCorrect = Array.isArray(question.correctAnswer)
        ? JSON.stringify(question.correctAnswer.sort()) === JSON.stringify((answer.answer as string[]).sort())
        : question.correctAnswer === answer.answer;

      if (isCorrect) {
        correctAnswers++;
        totalPoints += question.points;
      }

      return {
        questionId: answer.questionId,
        answer: answer.answer,
        isCorrect,
        points: isCorrect ? question.points : 0,
      };
    });

    const maxPoints = assessment.questions.reduce((sum, q) => sum + q.points, 0);
    const score = Math.round((totalPoints / maxPoints) * 100);
    const isPassed = score >= assessment.passingScore;

    // Create result
    const result = this.assessmentResultRepository.create({
      profileId,
      assessmentId: submitDto.assessmentId,
      skillId: assessment.skillId,
      score,
      correctAnswers,
      totalQuestions: assessment.totalQuestions,
      timeTakenMinutes: submitDto.timeTakenMinutes,
      isPassed,
      status: 'completed',
      answers: answerResults,
      feedback: this.generateFeedback(score, isPassed),
      completedAt: new Date(),
    });

    const saved = await this.assessmentResultRepository.save(result);

    // Update assessment stats
    assessment.timesTaken++;
    assessment.averageScore =
      (assessment.averageScore * (assessment.timesTaken - 1) + score) / assessment.timesTaken;
    await this.assessmentRepository.save(assessment);

    // Update user skill if exists
    const userSkill = await this.userSkillRepository.findOne({
      where: { profileId, skillId: assessment.skillId },
    });

    if (userSkill) {
      userSkill.assessmentScore = score;
      userSkill.lastAssessedAt = new Date();
      userSkill.isVerified = isPassed;
      await this.userSkillRepository.save(userSkill);
    }

    return this.mapAssessmentResultToResponseDto(saved, assessment.skill);
  }

  async getUserAssessmentResults(profileId: string): Promise<AssessmentResultResponseDto[]> {
    const results = await this.assessmentResultRepository.find({
      where: { profileId },
      relations: ['skill'],
      order: { createdAt: 'DESC' },
    });

    return results.map((r) => this.mapAssessmentResultToResponseDto(r, r.skill));
  }

  // Statistics
  async getUserSkillStats(profileId: string): Promise<UserSkillStatsDto> {
    const userSkills = await this.userSkillRepository.find({
      where: { profileId },
      relations: ['skill'],
    });

    const totalSkills = userSkills.length;
    const verifiedSkills = userSkills.filter((us) => us.isVerified).length;
    const totalEndorsements = userSkills.reduce((sum, us) => sum + us.endorsementCount, 0);
    const averageProficiency =
      totalSkills > 0
        ? userSkills.reduce((sum, us) => sum + us.proficiencyLevel, 0) / totalSkills
        : 0;

    const topSkills = userSkills
      .sort((a, b) => b.endorsementCount - a.endorsementCount || b.proficiencyLevel - a.proficiencyLevel)
      .slice(0, 5)
      .map((us) => ({
        skillId: us.skillId,
        skillName: us.skill.name,
        proficiencyLevel: us.proficiencyLevel,
        endorsementCount: us.endorsementCount,
      }));

    const skillsByCategory = userSkills.reduce((acc, us) => {
      const category = us.skill.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSkills,
      verifiedSkills,
      totalEndorsements,
      averageProficiency: Math.round(averageProficiency * 10) / 10,
      topSkills,
      skillsByCategory,
    };
  }

  // Private helper methods
  private generateFeedback(score: number, isPassed: boolean): string {
    if (isPassed) {
      if (score >= 90) return 'Excellent! You have demonstrated mastery of this skill.';
      if (score >= 80) return 'Great job! You have a strong understanding of this skill.';
      return 'Good work! You have passed the assessment.';
    } else {
      if (score >= 60) return 'You are close to passing. Review the material and try again.';
      return 'Keep practicing! Review the fundamentals and attempt the assessment again.';
    }
  }

  private mapSkillToResponseDto(skill: Skill): SkillResponseDto {
    return {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      category: skill.category,
      parentSkillId: skill.parentSkillId,
      relatedSkills: skill.relatedSkills || [],
      iconUrl: skill.iconUrl,
      isActive: skill.isActive,
      totalEndorsements: skill.totalEndorsements,
      userCount: skill.userCount,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
    };
  }

  private mapUserSkillToResponseDto(userSkill: UserSkill, skill: Skill): UserSkillResponseDto {
    return {
      id: userSkill.id,
      profileId: userSkill.profileId,
      skillId: userSkill.skillId,
      skillName: skill?.name || '',
      skillCategory: skill?.category || '',
      proficiencyLevel: userSkill.proficiencyLevel,
      yearsOfExperience: userSkill.yearsOfExperience,
      description: userSkill.description,
      isPublic: userSkill.isPublic,
      isVerified: userSkill.isVerified,
      endorsementCount: userSkill.endorsementCount,
      certifications: userSkill.certifications || [],
      projects: userSkill.projects || [],
      assessmentScore: userSkill.assessmentScore,
      lastAssessedAt: userSkill.lastAssessedAt,
      createdAt: userSkill.createdAt,
      updatedAt: userSkill.updatedAt,
    };
  }

  private mapEndorsementToResponseDto(
    endorsement: SkillEndorsement,
    endorser: UserProfile,
  ): SkillEndorsementResponseDto {
    return {
      id: endorsement.id,
      userSkillId: endorsement.userSkillId,
      endorserId: endorsement.endorserId,
      endorserName: endorser?.user ? `${endorser.user.firstName} ${endorser.user.lastName}`.trim() : '',
      endorserProfilePhotoUrl: endorser?.profilePhotoUrl || '',
      weight: endorsement.weight,
      comment: endorsement.comment,
      relationship: endorsement.relationship,
      isVerified: endorsement.isVerified,
      workExperience: endorsement.workExperience,
      createdAt: endorsement.createdAt,
    };
  }

  private mapAssessmentToResponseDto(assessment: SkillAssessment, skill: Skill): SkillAssessmentResponseDto {
    return {
      id: assessment.id,
      skillId: assessment.skillId,
      skillName: skill?.name || '',
      title: assessment.title,
      description: assessment.description,
      difficultyLevel: assessment.difficultyLevel,
      estimatedDurationMinutes: assessment.estimatedDurationMinutes,
      totalQuestions: assessment.totalQuestions,
      passingScore: assessment.passingScore,
      questions: assessment.questions.map((q) => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        points: q.points,
        explanation: q.explanation,
      })),
      tags: assessment.tags || [],
      isActive: assessment.isActive,
      timesTaken: assessment.timesTaken,
      averageScore: assessment.averageScore,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
    };
  }

  private mapAssessmentResultToResponseDto(
    result: SkillAssessmentResult,
    skill: Skill,
  ): AssessmentResultResponseDto {
    return {
      id: result.id,
      profileId: result.profileId,
      assessmentId: result.assessmentId,
      skillId: result.skillId,
      skillName: skill?.name || '',
      score: result.score,
      correctAnswers: result.correctAnswers,
      totalQuestions: result.totalQuestions,
      timeTakenMinutes: result.timeTakenMinutes,
      isPassed: result.isPassed,
      status: result.status,
      answers: result.answers || [],
      skillBreakdown: result.skillBreakdown || {},
      feedback: result.feedback,
      isVerified: result.isVerified,
      completedAt: result.completedAt,
      createdAt: result.createdAt,
    };
  }
}
