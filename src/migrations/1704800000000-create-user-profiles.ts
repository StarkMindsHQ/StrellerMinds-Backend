import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateUserProfilesTables1704800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_profiles table
    await queryRunner.createTable(
      new Table({
        name: 'user_profiles',
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
            isNullable: false,
          },
          {
            name: 'bio',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'headline',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'profilePhotoUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'coverPhotoUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'location',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'website',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'socialLinks',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'skills',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'specialization',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'yearsOfExperience',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'education',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'followersCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'followingCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'portfolioItemsCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'badgesCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'profileViews',
            type: 'int',
            default: 0,
          },
          {
            name: 'theme',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'showBadges',
            type: 'boolean',
            default: true,
          },
          {
            name: 'showPortfolio',
            type: 'boolean',
            default: true,
          },
          {
            name: 'showActivity',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isVerified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'completionStatus',
            type: 'varchar',
            length: '50',
            default: "'incomplete'",
          },
          {
            name: 'completionPercentage',
            type: 'int',
            default: 0,
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
        indices: [
          new TableIndex({ columnNames: ['user_id'], isUnique: true }),
        ],
      }),
    );

    // Create portfolio_items table
    await queryRunner.createTable(
      new Table({
        name: 'portfolio_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'profile_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'imageUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'projectUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'repositoryUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'certificateUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'technologies',
            type: 'jsonb',
            isNullable: true,
            default: "'[]'",
          },
          {
            name: 'tags',
            type: 'jsonb',
            isNullable: true,
            default: "'[]'",
          },
          {
            name: 'startDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'endDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'isFeatured',
            type: 'boolean',
            default: false,
          },
          {
            name: 'viewCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'likeCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'isPublic',
            type: 'boolean',
            default: true,
          },
          {
            name: 'displayOrder',
            type: 'int',
            default: 0,
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
        indices: [
          new TableIndex({ columnNames: ['profile_id'] }),
          new TableIndex({ columnNames: ['type'] }),
        ],
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
            length: '100',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'iconUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'rarity',
            type: 'int',
            default: 1,
          },
          {
            name: 'unlockedCriteria',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'totalAwarded',
            type: 'int',
            default: 0,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
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
        indices: [
          new TableIndex({ columnNames: ['category'] }),
          new TableIndex({ columnNames: ['isActive'] }),
        ],
      }),
    );

    // Create user_badges table
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
            name: 'profile_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'badge_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'unlockedReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isVisible',
            type: 'boolean',
            default: true,
          },
          {
            name: 'level',
            type: 'int',
            default: 1,
          },
          {
            name: 'awardedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({ columnNames: ['profile_id', 'badge_id'], isUnique: true }),
        ],
      }),
    );

    // Create follows table
    await queryRunner.createTable(
      new Table({
        name: 'follows',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'follower_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'following_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'follow'",
          },
          {
            name: 'isNotified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({ columnNames: ['follower_id', 'following_id'], isUnique: true }),
          new TableIndex({ columnNames: ['status'] }),
        ],
      }),
    );

    // Create privacy_settings table
    await queryRunner.createTable(
      new Table({
        name: 'privacy_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'profile_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'profileVisibility',
            type: 'varchar',
            length: '50',
            default: "'public'",
          },
          {
            name: 'portfolioVisibility',
            type: 'varchar',
            length: '50',
            default: "'public'",
          },
          {
            name: 'badgesVisibility',
            type: 'varchar',
            length: '50',
            default: "'public'",
          },
          {
            name: 'activityVisibility',
            type: 'varchar',
            length: '50',
            default: "'public'",
          },
          {
            name: 'allowMessaging',
            type: 'boolean',
            default: true,
          },
          {
            name: 'allowFollowing',
            type: 'boolean',
            default: true,
          },
          {
            name: 'allowMentions',
            type: 'boolean',
            default: true,
          },
          {
            name: 'showInSearch',
            type: 'boolean',
            default: true,
          },
          {
            name: 'showInRecommendations',
            type: 'boolean',
            default: true,
          },
          {
            name: 'shareActivityFeed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'shareAnalytics',
            type: 'boolean',
            default: false,
          },
          {
            name: 'allowThirdPartyIntegrations',
            type: 'boolean',
            default: false,
          },
          {
            name: 'emailNotifications',
            type: 'boolean',
            default: true,
          },
          {
            name: 'pushNotifications',
            type: 'boolean',
            default: true,
          },
          {
            name: 'marketingEmails',
            type: 'boolean',
            default: false,
          },
          {
            name: 'blockedUsers',
            type: 'jsonb',
            isNullable: true,
            default: "'[]'",
          },
          {
            name: 'mutedUsers',
            type: 'jsonb',
            isNullable: true,
            default: "'[]'",
          },
          {
            name: 'customPrivacy',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'dataRetentionDays',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'autoDeleteInactivity',
            type: 'boolean',
            default: false,
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
        indices: [
          new TableIndex({ columnNames: ['profile_id'], isUnique: true }),
        ],
      }),
    );

    // Create profile_analytics table
    await queryRunner.createTable(
      new Table({
        name: 'profile_analytics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'profile_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'totalViews',
            type: 'int',
            default: 0,
          },
          {
            name: 'viewsToday',
            type: 'int',
            default: 0,
          },
          {
            name: 'viewsThisWeek',
            type: 'int',
            default: 0,
          },
          {
            name: 'viewsThisMonth',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalFollowsGained',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalFollowsLost',
            type: 'int',
            default: 0,
          },
          {
            name: 'portfolioItemsViews',
            type: 'int',
            default: 0,
          },
          {
            name: 'portfolioItemsClicks',
            type: 'int',
            default: 0,
          },
          {
            name: 'badgesDisplays',
            type: 'int',
            default: 0,
          },
          {
            name: 'trafficSources',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'deviceTypes',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'topCountries',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'averageSessionDuration',
            type: 'int',
            default: 0,
          },
          {
            name: 'lastViewedAt',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'recentViewers',
            type: 'jsonb',
            isNullable: true,
            default: "'[]'",
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
        indices: [
          new TableIndex({ columnNames: ['profile_id'], isUnique: true }),
        ],
      }),
    );

    // Add foreign keys
    await queryRunner.createForeignKey(
      'user_profiles',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'portfolio_items',
      new TableForeignKey({
        columnNames: ['profile_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_profiles',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_badges',
      new TableForeignKey({
        columnNames: ['profile_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_profiles',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_badges',
      new TableForeignKey({
        columnNames: ['badge_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'badges',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'follows',
      new TableForeignKey({
        columnNames: ['follower_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_profiles',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'follows',
      new TableForeignKey({
        columnNames: ['following_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_profiles',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'privacy_settings',
      new TableForeignKey({
        columnNames: ['profile_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_profiles',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'profile_analytics',
      new TableForeignKey({
        columnNames: ['profile_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user_profiles',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const tables = [
      'user_profiles',
      'portfolio_items',
      'user_badges',
      'user_badges',
      'follows',
      'follows',
      'privacy_settings',
      'profile_analytics',
    ];

    for (const table of tables) {
      const foreignKeys = await queryRunner.query(
        `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = '${table}' AND constraint_type = 'FOREIGN KEY'`,
      );

      for (const fk of foreignKeys) {
        await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${fk.constraint_name}"`);
      }
    }

    // Drop tables
    await queryRunner.dropTable('profile_analytics');
    await queryRunner.dropTable('privacy_settings');
    await queryRunner.dropTable('follows');
    await queryRunner.dropTable('user_badges');
    await queryRunner.dropTable('badges');
    await queryRunner.dropTable('portfolio_items');
    await queryRunner.dropTable('user_profiles');
  }
}
