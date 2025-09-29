import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { CertificationType } from "./entities/certification-type.entity"
import { Certificate } from "./entities/certificate.entity"
import { SkillAssessment } from "./entities/skill-assessment.entity"
import { AssessmentAttempt } from "./entities/assessment-attempt.entity"
import { CertificateVerification } from "./entities/certificate-verification.entity"

import { CertificationTypeService } from "./services/certification-type.service"
import { CertificateService } from "./services/certificate.service"
import { SkillAssessmentService } from "./services/skill-assessment.service"
import { CertificateGeneratorService } from "./services/certificate-generator.service"
import { CertificateVerificationService } from "./services/certificate-verification.service"

import { CertificationTypeController } from "./controllers/certification-type.controller"
import { CertificateController } from "./controllers/certificate.controller"
import { SkillAssessmentController } from "./controllers/skill-assessment.controller"

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CertificationType,
      Certificate,
      SkillAssessment,
      AssessmentAttempt,
      CertificateVerification,
    ]),
  ],
  controllers: [CertificationTypeController, CertificateController, SkillAssessmentController],
  providers: [
    CertificationTypeService,
    CertificateService,
    SkillAssessmentService,
    CertificateGeneratorService,
    CertificateVerificationService,
  ],
  exports: [
    CertificationTypeService,
    CertificateService,
    SkillAssessmentService,
    CertificateGeneratorService,
    CertificateVerificationService,
  ],
})
export class CertificationModule {}
