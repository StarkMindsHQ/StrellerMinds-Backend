import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateCommunityTables1708100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Mentor Profiles
    await queryRunner.createTable(
      new Table({
        name: 'mentor_profiles',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'user_id', type: 'uuid' },
          { name: 'bio', type: 'text' },
          { name: 'expertise', type: 'jsonb' },
          { name: 'languages', type: 'jsonb', isNullable: true },
          { name: 'yearsOfExperience', type: 'int', default: 0 },
          { name: 'maxMentees', type: 'int', default: 5 },
          { name: 'currentMentees', type: 'int', default: 0 },
          { name: 'isAvailable', type: 'boolean', default: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'availability', type: 'jsonb', isNullable: true },
          { name: 'averageRating', type: 'decimal', precision: 3, scale: 2, default: 0 },
          { name: 'totalRatings', type: 'int', default: 0 },
          { name: 'totalMentorships', type: 'int', default: 0 },
          { name: 'completedMentorships', type: 'int', default: 0 },
          { name: 'certifications', type: 'jsonb', isNullable: true },
          { name: 'linkedinUrl', type: 'text', isNullable: true },
          { name: 'portfolioUrl', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // Mentorships
    await queryRunner.createTable(
      new Table({
        name: 'mentorships',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'mentor_id', type: 'uuid' },
          { name: 'mentee_id', type: 'uuid' },
          { name: 'status', type: 'varchar', length: '50', default: "'pending'" },
          { name: 'type', type: 'varchar', length: '50', default: "'one_on_one'" },
          { name: 'goals', type: 'text', isNullable: true },
          { name: 'focusAreas', type: 'jsonb', isNullable: true },
          { name: 'startDate', type: 'date', isNullable: true },
          { name: 'endDate', type: 'date', isNullable: true },
          { name: 'sessionsCompleted', type: 'int', default: 0 },
          { name: 'targetSessions', type: 'int', isNullable: true },
          { name: 'schedule', type: 'jsonb', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'mentorRating', type: 'int', isNullable: true },
          { name: 'menteeRating', type: 'int', isNullable: true },
          { name: 'feedback', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // Mentorship Sessions
    await queryRunner.createTable(
      new Table({
        name: 'mentorship_sessions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'mentorship_id', type: 'uuid' },
          { name: 'scheduledAt', type: 'timestamp' },
          { name: 'durationMinutes', type: 'int' },
          { name: 'status', type: 'varchar', length: '50', default: "'scheduled'" },
          { name: 'agenda', type: 'text', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'topics', type: 'jsonb', isNullable: true },
          { name: 'actionItems', type: 'jsonb', isNullable: true },
          { name: 'mentorRating', type: 'int', isNullable: true },
          { name: 'menteeRating', type: 'int', isNullable: true },
          { name: 'feedback', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // Community Groups
    await queryRunner.createTable(
      new Table({
        name: 'community_groups',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'description', type: 'text' },
          { name: 'type', type: 'varchar', length: '50' },
          { name: 'privacy', type: 'varchar', length: '50', default: "'public'" },
          { name: 'creator_id', type: 'uuid' },
          { name: 'coverImage', type: 'varchar', length: '255', isNullable: true },
          { name: 'tags', type: 'jsonb', isNullable: true },
          { name: 'memberCount', type: 'int', default: 0 },
          { name: 'maxMembers', type: 'int', isNullable: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'rules', type: 'jsonb', isNullable: true },
          { name: 'settings', type: 'jsonb', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // Group Members
    await queryRunner.createTable(
      new Table({
        name: 'group_members',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'group_id', type: 'uuid' },
          { name: 'user_id', type: 'uuid' },
          { name: 'role', type: 'varchar', length: '50', default: "'member'" },
          { name: 'status', type: 'varchar', length: '50', default: "'active'" },
          { name: 'joinedAt', type: 'timestamp', isNullable: true },
          { name: 'invitedBy', type: 'text', isNullable: true },
          { name: 'contributionScore', type: 'int', default: 0 },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // Community Events
    await queryRunner.createTable(
      new Table({
        name: 'community_events',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'title', type: 'varchar', length: '255' },
          { name: 'description', type: 'text' },
          { name: 'type', type: 'varchar', length: '50' },
          { name: 'status', type: 'varchar', length: '50', default: "'draft'" },
          { name: 'organizer_id', type: 'uuid' },
          { name: 'startDate', type: 'timestamp' },
          { name: 'endDate', type: 'timestamp' },
          { name: 'timezone', type: 'varchar', length: '100', isNullable: true },
          { name: 'location', type: 'varchar', length: '255', isNullable: true },
          { name: 'virtualLink', type: 'text', isNullable: true },
          { name: 'isVirtual', type: 'boolean', default: false },
          { name: 'maxAttendees', type: 'int', isNullable: true },
          { name: 'registeredCount', type: 'int', default: 0 },
          { name: 'attendedCount', type: 'int', default: 0 },
          { name: 'coverImage', type: 'varchar', length: '255', isNullable: true },
          { name: 'tags', type: 'jsonb', isNullable: true },
          { name: 'speakers', type: 'jsonb', isNullable: true },
          { name: 'agenda', type: 'jsonb', isNullable: true },
          { name: 'requiresApproval', type: 'boolean', default: false },
          { name: 'allowWaitlist', type: 'boolean', default: true },
          { name: 'gamificationPoints', type: 'int', default: 0 },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // Support Tickets
    await queryRunner.createTable(
      new Table({
        name: 'support_tickets',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'ticketNumber', type: 'varchar', length: '20', isUnique: true },
          { name: 'subject', type: 'varchar', length: '255' },
          { name: 'description', type: 'text' },
          { name: 'status', type: 'varchar', length: '50', default: "'open'" },
          { name: 'priority', type: 'varchar', length: '50', default: "'medium'" },
          { name: 'category', type: 'varchar', length: '50' },
          { name: 'created_by_id', type: 'uuid' },
          { name: 'assigned_to_id', type: 'uuid', isNullable: true },
          { name: 'tags', type: 'jsonb', isNullable: true },
          { name: 'firstResponseAt', type: 'timestamp', isNullable: true },
          { name: 'resolvedAt', type: 'timestamp', isNullable: true },
          { name: 'closedAt', type: 'timestamp', isNullable: true },
          { name: 'slaBreachMinutes', type: 'int', isNullable: true },
          { name: 'satisfactionRating', type: 'int', isNullable: true },
          { name: 'satisfactionFeedback', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // Peer Recognitions
    await queryRunner.createTable(
      new Table({
        name: 'peer_recognitions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'giver_id', type: 'uuid' },
          { name: 'recipient_id', type: 'uuid' },
          { name: 'type', type: 'varchar', length: '50' },
          { name: 'message', type: 'text' },
          { name: 'pointsAwarded', type: 'int', default: 10 },
          { name: 'isPublic', type: 'boolean', default: true },
          { name: 'relatedContent', type: 'varchar', length: '255', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex('mentorships', new TableIndex({ name: 'IDX_mentorships_mentor_status', columnNames: ['mentor_id', 'status'] }));
    await queryRunner.createIndex('mentorships', new TableIndex({ name: 'IDX_mentorships_mentee_status', columnNames: ['mentee_id', 'status'] }));
    await queryRunner.createIndex('community_groups', new TableIndex({ name: 'IDX_groups_type_privacy', columnNames: ['type', 'privacy'] }));
    await queryRunner.createIndex('group_members', new TableIndex({ name: 'IDX_group_members_group_user', columnNames: ['group_id', 'user_id'], isUnique: true }));
    await queryRunner.createIndex('community_events', new TableIndex({ name: 'IDX_events_type_status', columnNames: ['type', 'status'] }));
    await queryRunner.createIndex('support_tickets', new TableIndex({ name: 'IDX_tickets_status_priority', columnNames: ['status', 'priority'] }));
    await queryRunner.createIndex('peer_recognitions', new TableIndex({ name: 'IDX_recognitions_recipient', columnNames: ['recipient_id', 'createdAt'] }));

    // Create foreign keys
    await queryRunner.createForeignKey('mentor_profiles', new TableForeignKey({ columnNames: ['user_id'], referencedColumnNames: ['id'], referencedTableName: 'users', onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('mentorships', new TableForeignKey({ columnNames: ['mentor_id'], referencedColumnNames: ['id'], referencedTableName: 'users', onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('mentorships', new TableForeignKey({ columnNames: ['mentee_id'], referencedColumnNames: ['id'], referencedTableName: 'users', onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('mentorship_sessions', new TableForeignKey({ columnNames: ['mentorship_id'], referencedColumnNames: ['id'], referencedTableName: 'mentorships', onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('community_groups', new TableForeignKey({ columnNames: ['creator_id'], referencedColumnNames: ['id'], referencedTableName: 'users', onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('group_members', new TableForeignKey({ columnNames: ['group_id'], referencedColumnNames: ['id'], referencedTableName: 'community_groups', onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('group_members', new TableForeignKey({ columnNames: ['user_id'], referencedColumnNames: ['id'], referencedTableName: 'users', onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('community_events', new TableForeignKey({ columnNames: ['organizer_id'], referencedColumnNames: ['id'], referencedTableName: 'users', onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('support_tickets', new TableForeignKey({ columnNames: ['created_by_id'], referencedColumnNames: ['id'], referencedTableName: 'users', onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('peer_recognitions', new TableForeignKey({ columnNames: ['giver_id'], referencedColumnNames: ['id'], referencedTableName: 'users', onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('peer_recognitions', new TableForeignKey({ columnNames: ['recipient_id'], referencedColumnNames: ['id'], referencedTableName: 'users', onDelete: 'CASCADE' }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('peer_recognitions');
    await queryRunner.dropTable('support_tickets');
    await queryRunner.dropTable('community_events');
    await queryRunner.dropTable('group_members');
    await queryRunner.dropTable('community_groups');
    await queryRunner.dropTable('mentorship_sessions');
    await queryRunner.dropTable('mentorships');
    await queryRunner.dropTable('mentor_profiles');
  }
}
