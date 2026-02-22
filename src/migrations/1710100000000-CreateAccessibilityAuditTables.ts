import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAccessibilityAuditTables1710100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create accessibility_audits table
    await queryRunner.createTable(
      new Table({
        name: 'accessibility_audits',
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
            isNullable: true,
          },
          {
            name: 'url',
            type: 'varchar',
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'wcag_compliance',
              'keyboard_navigation',
              'screen_reader',
              'color_contrast',
              'form_accessibility',
              'full_audit',
            ],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['passed', 'failed', 'warning'],
          },
          {
            name: 'totalIssues',
            type: 'int',
            default: 0,
          },
          {
            name: 'criticalIssues',
            type: 'int',
            default: 0,
          },
          {
            name: 'seriousIssues',
            type: 'int',
            default: 0,
          },
          {
            name: 'moderateIssues',
            type: 'int',
            default: 0,
          },
          {
            name: 'minorIssues',
            type: 'int',
            default: 0,
          },
          {
            name: 'accessibilityScore',
            type: 'float',
            isNullable: true,
          },
          {
            name: 'wcag21AACompliant',
            type: 'boolean',
            default: false,
          },
          {
            name: 'auditResults',
            type: 'jsonb',
          },
          {
            name: 'recommendations',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'violations',
            type: 'text',
            isNullable: true,
            isArray: true,
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
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'accessibility_audits',
      new TableIndex({
        name: 'IDX_accessibility_audits_userId_createdAt',
        columnNames: ['userId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'accessibility_audits',
      new TableIndex({
        name: 'IDX_accessibility_audits_status_type',
        columnNames: ['status', 'type'],
      }),
    );

    await queryRunner.createIndex(
      'accessibility_audits',
      new TableIndex({
        name: 'IDX_accessibility_audits_url_createdAt',
        columnNames: ['url', 'createdAt'],
      }),
    );

    await queryRunner.createForeignKey(
      'accessibility_audits',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create accessibility_violations table
    await queryRunner.createTable(
      new Table({
        name: 'accessibility_violations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'auditId',
            type: 'uuid',
          },
          {
            name: 'type',
            type: 'varchar',
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['critical', 'serious', 'moderate', 'minor'],
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'wcagCriteria',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'recommendation',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'element',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'selector',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'accessibility_violations',
      new TableIndex({
        name: 'IDX_accessibility_violations_auditId_severity',
        columnNames: ['auditId', 'severity'],
      }),
    );

    await queryRunner.createIndex(
      'accessibility_violations',
      new TableIndex({
        name: 'IDX_accessibility_violations_wcagCriteria',
        columnNames: ['wcagCriteria'],
      }),
    );

    await queryRunner.createForeignKey(
      'accessibility_violations',
      new TableForeignKey({
        columnNames: ['auditId'],
        referencedTableName: 'accessibility_audits',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('accessibility_violations', true);
    await queryRunner.dropTable('accessibility_audits', true);
  }
}
