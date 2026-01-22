import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateCourseTables1735000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create courses table
        await queryRunner.createTable(
            new Table({
                name: 'courses',
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
                        name: 'subtitle',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'description',
                        type: 'text',
                    },
                    {
                        name: 'level',
                        type: 'varchar',
                    },
                    {
                        name: 'language',
                        type: 'varchar',
                    },
                    {
                        name: 'durationMinutes',
                        type: 'integer',
                        default: 0,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['draft', 'published', 'archived'],
                        default: "'draft'",
                    },
                    {
                        name: 'instructorId',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'price',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'currency',
                        type: 'varchar',
                        default: "'USD'",
                    },
                    {
                        name: 'publishedAt',
                        type: 'timestamp',
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
                    },
                    {
                        name: 'deletedAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                ],
                checks: [
                    {
                        columnNames: ['durationMinutes'],
                        expression: '"durationMinutes" >= 0',
                    },
                ],
            }),
            true,
        );

        // Create indexes for courses
        await queryRunner.createIndex(
            'courses',
            new TableIndex({
                name: 'IDX_COURSES_STATUS_CREATED_AT',
                columnNames: ['status', 'createdAt'],
            }),
        );

        await queryRunner.createIndex(
            'courses',
            new TableIndex({
                name: 'IDX_COURSES_INSTRUCTOR_ID',
                columnNames: ['instructorId'],
            }),
        );

        await queryRunner.createIndex(
            'courses',
            new TableIndex({
                name: 'IDX_COURSES_PUBLISHED_AT',
                columnNames: ['publishedAt'],
            }),
        );

        await queryRunner.createIndex(
            'courses',
            new TableIndex({
                name: 'IDX_COURSES_STATUS',
                columnNames: ['status'],
            }),
        );

        // Create foreign key for instructor
        await queryRunner.createForeignKey(
            'courses',
            new TableForeignKey({
                columnNames: ['instructorId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'SET NULL',
            }),
        );

        // Create categories table
        await queryRunner.createTable(
            new Table({
                name: 'categories',
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
                        name: 'slug',
                        type: 'varchar',
                        isUnique: true,
                    },
                    {
                        name: 'description',
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
                    },
                ],
            }),
            true,
        );

        await queryRunner.createIndex(
            'categories',
            new TableIndex({
                name: 'IDX_CATEGORIES_NAME',
                columnNames: ['name'],
            }),
        );

        // Create tags table
        await queryRunner.createTable(
            new Table({
                name: 'tags',
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
            'tags',
            new TableIndex({
                name: 'IDX_TAGS_NAME',
                columnNames: ['name'],
            }),
        );

        // Create course_categories junction table
        await queryRunner.createTable(
            new Table({
                name: 'course_categories',
                columns: [
                    {
                        name: 'courseId',
                        type: 'uuid',
                    },
                    {
                        name: 'categoryId',
                        type: 'uuid',
                    },
                ],
            }),
            true,
        );

        await queryRunner.createPrimaryKey('course_categories', ['courseId', 'categoryId']);

        await queryRunner.createForeignKeys('course_categories', [
            new TableForeignKey({
                columnNames: ['courseId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'courses',
                onDelete: 'CASCADE',
            }),
            new TableForeignKey({
                columnNames: ['categoryId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'categories',
                onDelete: 'CASCADE',
            }),
        ]);

        // Create course_tags junction table
        await queryRunner.createTable(
            new Table({
                name: 'course_tags',
                columns: [
                    {
                        name: 'courseId',
                        type: 'uuid',
                    },
                    {
                        name: 'tagId',
                        type: 'uuid',
                    },
                ],
            }),
            true,
        );

        await queryRunner.createPrimaryKey('course_tags', ['courseId', 'tagId']);

        await queryRunner.createForeignKeys('course_tags', [
            new TableForeignKey({
                columnNames: ['courseId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'courses',
                onDelete: 'CASCADE',
            }),
            new TableForeignKey({
                columnNames: ['tagId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'tags',
                onDelete: 'CASCADE',
            }),
        ]);

        // Create course_modules table
        await queryRunner.createTable(
            new Table({
                name: 'course_module',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'courseId',
                        type: 'uuid',
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
                        name: 'order',
                        type: 'integer',
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
            }),
            true,
        );

        await queryRunner.createForeignKey(
            'course_module',
            new TableForeignKey({
                columnNames: ['courseId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'courses',
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createIndex(
            'course_module',
            new TableIndex({
                name: 'IDX_COURSE_MODULE_COURSE_ID',
                columnNames: ['courseId'],
            }),
        );

        // Create lessons table
        await queryRunner.createTable(
            new Table({
                name: 'lesson',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'moduleId',
                        type: 'uuid',
                    },
                    {
                        name: 'title',
                        type: 'varchar',
                    },
                    {
                        name: 'content',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'videoUrl',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'duration',
                        type: 'integer',
                        default: 0,
                    },
                    {
                        name: 'order',
                        type: 'integer',
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
            }),
            true,
        );

        await queryRunner.createForeignKey(
            'lesson',
            new TableForeignKey({
                columnNames: ['moduleId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'course_module',
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createIndex(
            'lesson',
            new TableIndex({
                name: 'IDX_LESSON_MODULE_ID',
                columnNames: ['moduleId'],
            }),
        );

        // Create enrollments table
        await queryRunner.createTable(
            new Table({
                name: 'enrollments',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'studentId',
                        type: 'uuid',
                    },
                    {
                        name: 'courseId',
                        type: 'uuid',
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['active', 'completed', 'dropped', 'suspended'],
                        default: "'active'",
                    },
                    {
                        name: 'progress',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'lastAccessedAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'completedAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'enrolledAt',
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

        // Create unique index on studentId + courseId
        await queryRunner.createIndex(
            'enrollments',
            new TableIndex({
                name: 'IDX_ENROLLMENTS_STUDENT_COURSE',
                columnNames: ['studentId', 'courseId'],
                isUnique: true,
            }),
        );

        await queryRunner.createIndex(
            'enrollments',
            new TableIndex({
                name: 'IDX_ENROLLMENTS_STATUS',
                columnNames: ['status'],
            }),
        );

        await queryRunner.createIndex(
            'enrollments',
            new TableIndex({
                name: 'IDX_ENROLLMENTS_ENROLLED_AT',
                columnNames: ['enrolledAt'],
            }),
        );

        await queryRunner.createIndex(
            'enrollments',
            new TableIndex({
                name: 'IDX_ENROLLMENTS_STUDENT_STATUS',
                columnNames: ['studentId', 'status'],
            }),
        );

        // Create foreign keys for enrollments
        await queryRunner.createForeignKeys('enrollments', [
            new TableForeignKey({
                columnNames: ['studentId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
            new TableForeignKey({
                columnNames: ['courseId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'courses',
                onDelete: 'CASCADE',
            }),
        ]);

        // Create course_versions table
        await queryRunner.createTable(
            new Table({
                name: 'course_version',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'courseId',
                        type: 'uuid',
                    },
                    {
                        name: 'version',
                        type: 'integer',
                    },
                    {
                        name: 'changes',
                        type: 'text',
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

        await queryRunner.createForeignKey(
            'course_version',
            new TableForeignKey({
                columnNames: ['courseId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'courses',
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createIndex(
            'course_version',
            new TableIndex({
                name: 'IDX_COURSE_VERSION_COURSE_ID',
                columnNames: ['courseId'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order
        await queryRunner.dropTable('course_version');
        await queryRunner.dropTable('enrollments');
        await queryRunner.dropTable('lesson');
        await queryRunner.dropTable('course_module');
        await queryRunner.dropTable('course_tags');
        await queryRunner.dropTable('course_categories');
        await queryRunner.dropTable('tags');
        await queryRunner.dropTable('categories');
        await queryRunner.dropTable('courses');
    }
}
