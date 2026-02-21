import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  IsEnum,
  IsUrl,
  Length,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Skill DTOs
export class CreateSkillDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['technical', 'soft', 'language', 'creative', 'business', 'other'])
  category: 'technical' | 'soft' | 'language' | 'creative' | 'business' | 'other';

  @IsOptional()
  @IsString()
  parentSkillId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedSkills?: string[];

  @IsOptional()
  @IsUrl()
  iconUrl?: string;
}

export class UpdateSkillDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['technical', 'soft', 'language', 'creative', 'business', 'other'])
  category?: 'technical' | 'soft' | 'language' | 'creative' | 'business' | 'other';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedSkills?: string[];

  @IsOptional()
  @IsUrl()
  iconUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SkillResponseDto {
  id: string;
  name: string;
  description: string;
  category: string;
  parentSkillId: string;
  relatedSkills: string[];
  iconUrl: string;
  isActive: boolean;
  totalEndorsements: number;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// User Skill DTOs
export class CreateUserSkillDto {
  @IsString()
  skillId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  proficiencyLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  certifications?: Array<{
    name: string;
    issuer: string;
    dateObtained: Date;
    expiryDate?: Date;
    credentialUrl?: string;
  }>;

  @IsOptional()
  @IsArray()
  projects?: Array<{
    name: string;
    description: string;
    url?: string;
  }>;
}

export class UpdateUserSkillDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  proficiencyLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  certifications?: Array<{
    name: string;
    issuer: string;
    dateObtained: Date;
    expiryDate?: Date;
    credentialUrl?: string;
  }>;

  @IsOptional()
  @IsArray()
  projects?: Array<{
    name: string;
    description: string;
    url?: string;
  }>;
}

export class UserSkillResponseDto {
  id: string;
  profileId: string;
  skillId: string;
  skillName: string;
  skillCategory: string;
  proficiencyLevel: number;
  yearsOfExperience: number;
  description: string;
  isPublic: boolean;
  isVerified: boolean;
  endorsementCount: number;
  certifications: Array<{
    name: string;
    issuer: string;
    dateObtained: Date;
    expiryDate?: Date;
    credentialUrl?: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    url?: string;
  }>;
  assessmentScore: number;
  lastAssessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Skill Endorsement DTOs
export class CreateSkillEndorsementDto {
  @IsString()
  userSkillId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  weight?: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsEnum(['colleague', 'manager', 'report', 'client', 'peer', 'other'])
  relationship?: 'colleague' | 'manager' | 'report' | 'client' | 'peer' | 'other';

  @IsOptional()
  @IsObject()
  workExperience?: {
    company?: string;
    project?: string;
    duration?: string;
  };
}

export class SkillEndorsementResponseDto {
  id: string;
  userSkillId: string;
  endorserId: string;
  endorserName: string;
  endorserProfilePhotoUrl: string;
  weight: number;
  comment: string;
  relationship: string;
  isVerified: boolean;
  workExperience: {
    company?: string;
    project?: string;
    duration?: string;
  };
  createdAt: Date;
}

// Skill Assessment DTOs
export class CreateSkillAssessmentDto {
  @IsString()
  skillId: string;

  @IsString()
  @Length(1, 255)
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  difficultyLevel: number;

  @IsNumber()
  @Min(1)
  estimatedDurationMinutes: number;

  @IsNumber()
  @Min(1)
  totalQuestions: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore: number;

  @IsArray()
  questions: Array<{
    id: string;
    type: 'multiple_choice' | 'true_false' | 'coding' | 'text';
    question: string;
    options?: string[];
    correctAnswer: string | string[];
    points: number;
    explanation?: string;
  }>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class SkillAssessmentResponseDto {
  id: string;
  skillId: string;
  skillName: string;
  title: string;
  description: string;
  difficultyLevel: number;
  estimatedDurationMinutes: number;
  totalQuestions: number;
  passingScore: number;
  questions: Array<{
    id: string;
    type: 'multiple_choice' | 'true_false' | 'coding' | 'text';
    question: string;
    options?: string[];
    points: number;
    explanation?: string;
  }>;
  tags: string[];
  isActive: boolean;
  timesTaken: number;
  averageScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export class SubmitAssessmentDto {
  @IsString()
  assessmentId: string;

  @IsArray()
  answers: Array<{
    questionId: string;
    answer: string | string[];
  }>;

  @IsNumber()
  @Min(1)
  timeTakenMinutes: number;
}

export class AssessmentResultResponseDto {
  id: string;
  profileId: string;
  assessmentId: string;
  skillId: string;
  skillName: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeTakenMinutes: number;
  isPassed: boolean;
  status: string;
  answers: Array<{
    questionId: string;
    answer: string | string[];
    isCorrect: boolean;
    points: number;
  }>;
  skillBreakdown: Record<string, number>;
  feedback: string;
  isVerified: boolean;
  completedAt: Date;
  createdAt: Date;
}

// Search and Filter DTOs
export class SearchSkillsDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsEnum(['technical', 'soft', 'language', 'creative', 'business', 'other'])
  category?: 'technical' | 'soft' | 'language' | 'creative' | 'business' | 'other';

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class SkillSearchResponseDto {
  skills: SkillResponseDto[];
  total: number;
  page: number;
  totalPages: number;
}

export class UserSkillStatsDto {
  totalSkills: number;
  verifiedSkills: number;
  totalEndorsements: number;
  averageProficiency: number;
  topSkills: Array<{
    skillId: string;
    skillName: string;
    proficiencyLevel: number;
    endorsementCount: number;
  }>;
  skillsByCategory: Record<string, number>;
}
