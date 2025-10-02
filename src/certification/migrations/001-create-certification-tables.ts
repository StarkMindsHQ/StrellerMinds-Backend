import { type MigrationInterface, type QueryRunner, Table, Index } from 'typeorm';

export class CreateCertificationTables1703002000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create certification_types table
    await queryRunner.createTable(
      new Table({
        name: 'certification_types',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'category',
            type: 'enum',
            enum: [
              'course_completion',
              'skill_assessment',
              'professional',
              'achievement',
              'custom',
            ],
            default: "'course_completion'",
          },
          {
            name: 'level',
            type: 'enum',
            enum: ['beginner', 'intermediate', 'advanced', 'expert'],
            default: "'beginner'",
          },
          {
            name: 'requirements',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'template',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'validityDays',
            type: 'int',
            default: 0,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create certificates table
    await queryRunner.createTable(
      new Table({
        name: 'certificates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'certificationTypeId',
            type: 'uuid',
          },
          {
            name: 'certificateNumber',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'recipientName',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'recipientEmail',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'issued', 'revoked', 'expired', 'suspended'],
            default: "'pending'",
          },
          {
            name: 'score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'certificateUrl',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'verificationHash',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'issuedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'issuedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'revocationReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['certificationTypeId'],
            referencedTableName: 'certification_types',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create skill_assessments table
    await queryRunner.createTable(
      new Table({
        name: 'skill_assessments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'skillArea',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['multiple_choice', 'practical', 'project', 'oral', 'mixed'],
            default: "'multiple_choice'",
          },
          {
            name: 'difficulty',
            type: 'enum',
            enum: ['easy', 'medium', 'hard', 'expert'],
            default: "'medium'",
          },
          {
            name: 'questions',
            type: 'json',
          },
          {
            name: 'timeLimit',
            type: 'int',
            default: 60,
          },
          {
            name: 'passingScore',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 70,
          },
          {
            name: 'maxAttempts',
            type: 'int',
            default: 3,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'prerequisites',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'settings',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create assessment_attempts table
    await queryRunner.createTable(
      new Table({
        name: 'assessment_attempts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'assessmentId',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['in_progress', 'completed', 'abandoned', 'expired'],
            default: "'in_progress'",
          },
          {
            name: 'answers',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'percentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'passed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'attemptNumber',
            type: 'int',
            default: 1,
          },
          {
            name: 'startedAt',
            type: 'timestamp',
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'timeSpent',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'feedback',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'proctoring',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['assessmentId'],
            referencedTableName: 'skill_assessments',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create certificate_verifications table
    await queryRunner.createTable(
      new Table({
        name: 'certificate_verifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'certificateId',
            type: 'uuid',
          },
          {
            name: 'verifierInfo',
            type: 'json',
          },
          {
            name: 'isValid',
            type: 'boolean',
            default: true,
          },
          {
            name: 'verificationDetails',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['certificateId'],
            referencedTableName: 'certificates',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'certificates',
      new Index('IDX_certificates_user_id', ['userId']),
    );
    await queryRunner.createIndex(
      'certificates',
      new Index('IDX_certificates_certificate_number', ['certificateNumber']),
    );
    await queryRunner.createIndex('certificates', new Index('IDX_certificates_status', ['status']));
    await queryRunner.createIndex(
      'skill_assessments',
      new Index('IDX_skill_assessments_skill_area', ['skillArea']),
    );
    await queryRunner.createIndex(
      'skill_assessments',
      new Index('IDX_skill_assessments_is_active', ['isActive']),
    );
    await queryRunner.createIndex(
      'assessment_attempts',
      new Index('IDX_assessment_attempts_user_id', ['userId']),
    );
    await queryRunner.createIndex(
      'assessment_attempts',
      new Index('IDX_assessment_attempts_status', ['status']),
    );
    await queryRunner.createIndex(
      'assessment_attempts',
      new Index('IDX_assessment_attempts_started_at', ['startedAt']),
    );
    await queryRunner.createIndex(
      'certificate_verifications',
      new Index('IDX_certificate_verifications_certificate_id', ['certificateId']),
    );
    await queryRunner.createIndex(
      'certificate_verifications',
      new Index('IDX_certificate_verifications_created_at', ['createdAt']),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('certificate_verifications');
    await queryRunner.dropTable('assessment_attempts');
    await queryRunner.dropTable('skill_assessments');
    await queryRunner.dropTable('certificates');
    await queryRunner.dropTable('certification_types');
  }
}
