import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateGamificationTables1735100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create gamification_profiles table
    await queryRunner.createTable(
      new Table({
        name: 'gamification_profiles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'points',
            type: 'integer',
            default: 0,
          },
          {
            name: 'xp',
            type: 'integer',
            default: 0,
          },
          {
            name: 'level',
            type: 'integer',
            default: 1,
          },
          {
            name: 'virtual_currency',
            type: 'integer',
            default: 0,
          },
          {
            name: 'current_streak',
            type: 'integer',
            default: 0,
          },
          {
            name: 'longest_streak',
            type: 'integer',
            default: 0,
          },
          {
            name: 'last_activity_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        checks: [
          {
            columnNames: ['points'],
            expression: '"points" >= 0',
          },
          {
            columnNames: ['xp'],
            expression: '"xp" >= 0',
          },
          {
            columnNames: ['level'],
            expression: '"level" >= 1',
          },
          {
            columnNames: ['virtual_currency'],
            expression: '"virtual_currency" >= 0',
          },
          {
            columnNames: ['current_streak'],
            expression: '"current_streak" >= 0',
          },
          {
            columnNames: ['longest_streak'],
            expression: '"longest_streak" >= 0',
          },
        ],
      }),
      true,
    );

    // Create unique index on user_id
    await queryRunner.createIndex(
      'gamification_profiles',
      new TableIndex({
        name: 'IDX_GAMIFICATION_PROFILES_USER_ID',
        columnNames: ['user_id'],
        isUnique: true,
      }),
    );

    // Create foreign key to users
    await queryRunner.createForeignKey(
      'gamification_profiles',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create badges table
    await queryRunner.createTable(
      new Table({
        name: 'badges',
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
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'icon',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'criteria',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'points',
            type: 'integer',
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'badges',
      new TableIndex({
        name: 'IDX_BADGES_NAME',
        columnNames: ['name'],
      }),
    );

    // Create user_badges junction table
    await queryRunner.createTable(
      new Table({
        name: 'user_badges',
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
            name: 'badgeId',
            type: 'uuid',
          },
          {
            name: 'earnedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create unique index on userId + badgeId
    await queryRunner.createIndex(
      'user_badges',
      new TableIndex({
        name: 'IDX_USER_BADGES_USER_BADGE',
        columnNames: ['userId', 'badgeId'],
        isUnique: true,
      }),
    );

    // Create foreign keys for user_badges
    await queryRunner.createForeignKeys('user_badges', [
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['badgeId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'badges',
        onDelete: 'CASCADE',
      }),
    ]);

    // Create challenges table
    await queryRunner.createTable(
      new Table({
        name: 'challenges',
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
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
          },
          {
            name: 'target',
            type: 'integer',
          },
          {
            name: 'reward_points',
            type: 'integer',
            default: 0,
          },
          {
            name: 'reward_xp',
            type: 'integer',
            default: 0,
          },
          {
            name: 'start_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'end_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'challenges',
      new TableIndex({
        name: 'IDX_CHALLENGES_IS_ACTIVE',
        columnNames: ['is_active'],
      }),
    );

    await queryRunner.createIndex(
      'challenges',
      new TableIndex({
        name: 'IDX_CHALLENGES_START_END_DATE',
        columnNames: ['start_date', 'end_date'],
      }),
    );

    // Create rewards table
    await queryRunner.createTable(
      new Table({
        name: 'rewards',
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
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'cost',
            type: 'integer',
          },
          {
            name: 'type',
            type: 'varchar',
          },
          {
            name: 'is_available',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'rewards',
      new TableIndex({
        name: 'IDX_REWARDS_IS_AVAILABLE',
        columnNames: ['is_available'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.dropTable('rewards');
    await queryRunner.dropTable('challenges');
    await queryRunner.dropTable('user_badges');
    await queryRunner.dropTable('badges');
    await queryRunner.dropTable('gamification_profiles');
  }
}
