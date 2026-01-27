import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateLearningPathTables1735400000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create learning_paths table
        await queryRunner.createTable(new Table({
            name: "learning_paths",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()",
                },
                {
                    name: "title",
                    type: "varchar",
                },
                {
                    name: "description",
                    type: "text",
                    isNullable: true,
                },
                {
                    name: "type",
                    type: "enum",
                    enum: ["linear", "adaptive", "custom"],
                    default: "'linear'",
                },
                {
                    name: "status",
                    type: "enum",
                    enum: ["draft", "published", "archived"],
                    default: "'draft'",
                },
                {
                    name: "instructor_id",
                    type: "uuid",
                },
                {
                    name: "template_id",
                    type: "uuid",
                    isNullable: true,
                },
                {
                    name: "metadata",
                    type: "jsonb",
                    default: "'{}'",
                },
                {
                    name: "estimated_duration_hours",
                    type: "integer",
                    default: 0,
                },
                {
                    name: "total_nodes",
                    type: "integer",
                    default: 0,
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()",
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "now()",
                },
                {
                    name: "deleted_at",
                    type: "timestamp",
                    isNullable: true,
                },
            ],
        }), true);

        // Create learning_path_nodes table
        await queryRunner.createTable(new Table({
            name: "learning_path_nodes",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()",
                },
                {
                    name: "learning_path_id",
                    type: "uuid",
                },
                {
                    name: "type",
                    type: "enum",
                    enum: ["course", "module", "assessment", "project", "milestone"],
                },
                {
                    name: "course_id",
                    type: "uuid",
                    isNullable: true,
                },
                {
                    name: "title",
                    type: "varchar",
                },
                {
                    name: "description",
                    type: "varchar",
                    isNullable: true,
                },
                {
                    name: "position",
                    type: "integer",
                    default: 0,
                },
                {
                    name: "status",
                    type: "enum",
                    enum: ["active", "inactive", "completed"],
                    default: "'active'",
                },
                {
                    name: "estimated_duration_hours",
                    type: "integer",
                    default: 0,
                },
                {
                    name: "metadata",
                    type: "jsonb",
                    default: "'{}'",
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()",
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "now()",
                },
            ],
        }), true);

        // Create node_dependencies table
        await queryRunner.createTable(new Table({
            name: "node_dependencies",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()",
                },
                {
                    name: "source_node_id",
                    type: "uuid",
                },
                {
                    name: "target_node_id",
                    type: "uuid",
                },
                {
                    name: "type",
                    type: "enum",
                    enum: ["prerequisite", "corequisite", "recommended", "unlocks"],
                    default: "'prerequisite'",
                },
                {
                    name: "conditions",
                    type: "jsonb",
                    default: "'{}'",
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()",
                },
            ],
        }), true);

        // Create learning_objectives table
        await queryRunner.createTable(new Table({
            name: "learning_objectives",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()",
                },
                {
                    name: "title",
                    type: "varchar",
                },
                {
                    name: "description",
                    type: "text",
                },
                {
                    name: "type",
                    type: "enum",
                    enum: ["knowledge", "skill", "competency", "certification"],
                },
                {
                    name: "difficulty",
                    type: "enum",
                    enum: ["beginner", "intermediate", "advanced", "expert"],
                },
                {
                    name: "domain",
                    type: "varchar",
                },
                {
                    name: "bloom_taxonomy_level",
                    type: "varchar",
                    isNullable: true,
                },
                {
                    name: "keywords",
                    type: "jsonb",
                    default: "'[]'",
                },
                {
                    name: "metadata",
                    type: "jsonb",
                    default: "'{}'",
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()",
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "now()",
                },
            ],
        }), true);

        // Create learning_path_enrollments table
        await queryRunner.createTable(new Table({
            name: "learning_path_enrollments",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()",
                },
                {
                    name: "user_id",
                    type: "uuid",
                },
                {
                    name: "learning_path_id",
                    type: "uuid",
                },
                {
                    name: "status",
                    type: "enum",
                    enum: ["enrolled", "in_progress", "completed", "dropped", "paused"],
                    default: "'enrolled'",
                },
                {
                    name: "start_date",
                    type: "timestamp",
                    isNullable: true,
                },
                {
                    name: "completion_date",
                    type: "timestamp",
                    isNullable: true,
                },
                {
                    name: "overall_progress",
                    type: "decimal",
                    precision: 5,
                    scale: 2,
                    default: 0,
                },
                {
                    name: "preferences",
                    type: "jsonb",
                    default: "'{}'",
                },
                {
                    name: "metadata",
                    type: "jsonb",
                    default: "'{}'",
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()",
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "now()",
                },
            ],
        }), true);

        // Create node_progress table
        await queryRunner.createTable(new Table({
            name: "node_progress",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()",
                },
                {
                    name: "enrollment_id",
                    type: "uuid",
                },
                {
                    name: "node_id",
                    type: "uuid",
                },
                {
                    name: "status",
                    type: "enum",
                    enum: ["not_started", "in_progress", "completed", "failed", "skipped"],
                    default: "'not_started'",
                },
                {
                    name: "completion_percentage",
                    type: "decimal",
                    precision: 5,
                    scale: 2,
                    default: 0,
                },
                {
                    name: "time_spent_minutes",
                    type: "integer",
                    default: 0,
                },
                {
                    name: "score",
                    type: "integer",
                    isNullable: true,
                },
                {
                    name: "attempts",
                    type: "integer",
                    isNullable: true,
                },
                {
                    name: "started_at",
                    type: "timestamp",
                    isNullable: true,
                },
                {
                    name: "completed_at",
                    type: "timestamp",
                    isNullable: true,
                },
                {
                    name: "assessment_data",
                    type: "jsonb",
                    default: "'{}'",
                },
                {
                    name: "metadata",
                    type: "jsonb",
                    default: "'{}'",
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()",
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "now()",
                },
            ],
        }), true);

        // Create learning_path_templates table
        await queryRunner.createTable(new Table({
            name: "learning_path_templates",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()",
                },
                {
                    name: "name",
                    type: "varchar",
                },
                {
                    name: "description",
                    type: "text",
                },
                {
                    name: "category",
                    type: "enum",
                    enum: ["foundation", "specialization", "certification", "bootcamp", "degree_prep", "skill_path"],
                },
                {
                    name: "is_public",
                    type: "boolean",
                    default: false,
                },
                {
                    name: "created_by",
                    type: "uuid",
                    isNullable: true,
                },
                {
                    name: "structure",
                    type: "jsonb",
                    default: "'{}'",
                },
                {
                    name: "tags",
                    type: "jsonb",
                    default: "'[]'",
                },
                {
                    name: "usage_count",
                    type: "integer",
                    default: 0,
                },
                {
                    name: "estimated_duration_hours",
                    type: "integer",
                    default: 0,
                },
                {
                    name: "metadata",
                    type: "jsonb",
                    default: "'{}'",
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()",
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "now()",
                },
            ],
        }), true);

        // Create junction table for node prerequisites
        await queryRunner.createTable(new Table({
            name: "node_prerequisites",
            columns: [
                {
                    name: "node_id",
                    type: "uuid",
                },
                {
                    name: "prerequisite_node_id",
                    type: "uuid",
                },
            ],
        }), true);

        // Create junction table for node learning objectives
        await queryRunner.createTable(new Table({
            name: "node_learning_objectives",
            columns: [
                {
                    name: "node_id",
                    type: "uuid",
                },
                {
                    name: "objective_id",
                    type: "uuid",
                },
            ],
        }), true);

        // Create foreign key constraints
        await queryRunner.createForeignKey("learning_paths", new TableForeignKey({
            columnNames: ["instructor_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE",
        }));

        await queryRunner.createForeignKey("learning_paths", new TableForeignKey({
            columnNames: ["template_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "learning_path_templates",
            onDelete: "SET NULL",
        }));

        await queryRunner.createForeignKey("learning_path_nodes", new TableForeignKey({
            columnNames: ["learning_path_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "learning_paths",
            onDelete: "CASCADE",
        }));

        await queryRunner.createForeignKey("learning_path_nodes", new TableForeignKey({
            columnNames: ["course_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "courses",
            onDelete: "SET NULL",
        }));

        await queryRunner.createForeignKey("node_dependencies", new TableForeignKey({
            columnNames: ["source_node_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "learning_path_nodes",
            onDelete: "CASCADE",
        }));

        await queryRunner.createForeignKey("node_dependencies", new TableForeignKey({
            columnNames: ["target_node_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "learning_path_nodes",
            onDelete: "CASCADE",
        }));

        await queryRunner.createForeignKey("learning_path_enrollments", new TableForeignKey({
            columnNames: ["user_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE",
        }));

        await queryRunner.createForeignKey("learning_path_enrollments", new TableForeignKey({
            columnNames: ["learning_path_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "learning_paths",
            onDelete: "CASCADE",
        }));

        await queryRunner.createForeignKey("node_progress", new TableForeignKey({
            columnNames: ["enrollment_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "learning_path_enrollments",
            onDelete: "CASCADE",
        }));

        await queryRunner.createForeignKey("node_progress", new TableForeignKey({
            columnNames: ["node_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "learning_path_nodes",
            onDelete: "CASCADE",
        }));

        await queryRunner.createForeignKey("learning_path_templates", new TableForeignKey({
            columnNames: ["created_by"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "SET NULL",
        }));

        await queryRunner.createForeignKey("node_prerequisites", new TableForeignKey({
            columnNames: ["node_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "learning_path_nodes",
            onDelete: "CASCADE",
        }));

        await queryRunner.createForeignKey("node_prerequisites", new TableForeignKey({
            columnNames: ["prerequisite_node_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "learning_path_nodes",
            onDelete: "CASCADE",
        }));

        await queryRunner.createForeignKey("node_learning_objectives", new TableForeignKey({
            columnNames: ["node_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "learning_path_nodes",
            onDelete: "CASCADE",
        }));

        await queryRunner.createForeignKey("node_learning_objectives", new TableForeignKey({
            columnNames: ["objective_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "learning_objectives",
            onDelete: "CASCADE",
        }));

        // Create indexes
        await queryRunner.createIndex("learning_paths", new TableIndex({
            name: "IDX_LEARNING_PATH_STATUS_CREATED",
            columnNames: ["status", "created_at"],
        }));

        await queryRunner.createIndex("learning_paths", new TableIndex({
            name: "IDX_LEARNING_PATH_INSTRUCTOR",
            columnNames: ["instructor_id"],
        }));

        await queryRunner.createIndex("learning_paths", new TableIndex({
            name: "IDX_LEARNING_PATH_TEMPLATE",
            columnNames: ["template_id"],
        }));

        await queryRunner.createIndex("learning_path_nodes", new TableIndex({
            name: "IDX_NODE_PATH_POSITION",
            columnNames: ["learning_path_id", "position"],
        }));

        await queryRunner.createIndex("learning_path_nodes", new TableIndex({
            name: "IDX_NODE_COURSE",
            columnNames: ["course_id"],
        }));

        await queryRunner.createIndex("node_dependencies", new TableIndex({
            name: "IDX_DEPENDENCY_SOURCE_TARGET",
            columnNames: ["source_node_id", "target_node_id"],
        }));

        await queryRunner.createIndex("node_dependencies", new TableIndex({
            name: "IDX_DEPENDENCY_TYPE",
            columnNames: ["type"],
        }));

        await queryRunner.createIndex("learning_objectives", new TableIndex({
            name: "IDX_OBJECTIVE_TYPE",
            columnNames: ["type"],
        }));

        await queryRunner.createIndex("learning_objectives", new TableIndex({
            name: "IDX_OBJECTIVE_DOMAIN",
            columnNames: ["domain"],
        }));

        await queryRunner.createIndex("learning_path_enrollments", new TableIndex({
            name: "IDX_ENROLLMENT_USER_PATH",
            columnNames: ["user_id", "learning_path_id"],
        }));

        await queryRunner.createIndex("learning_path_enrollments", new TableIndex({
            name: "IDX_ENROLLMENT_STATUS",
            columnNames: ["status"],
        }));

        await queryRunner.createIndex("node_progress", new TableIndex({
            name: "IDX_PROGRESS_ENROLLMENT_NODE",
            columnNames: ["enrollment_id", "node_id"],
        }));

        await queryRunner.createIndex("node_progress", new TableIndex({
            name: "IDX_PROGRESS_STATUS",
            columnNames: ["status"],
        }));

        await queryRunner.createIndex("learning_path_templates", new TableIndex({
            name: "IDX_TEMPLATE_CATEGORY",
            columnNames: ["category"],
        }));

        await queryRunner.createIndex("learning_path_templates", new TableIndex({
            name: "IDX_TEMPLATE_PUBLIC",
            columnNames: ["is_public"],
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.dropIndex("learning_paths", "IDX_LEARNING_PATH_STATUS_CREATED");
        await queryRunner.dropIndex("learning_paths", "IDX_LEARNING_PATH_INSTRUCTOR");
        await queryRunner.dropIndex("learning_paths", "IDX_LEARNING_PATH_TEMPLATE");
        await queryRunner.dropIndex("learning_path_nodes", "IDX_NODE_PATH_POSITION");
        await queryRunner.dropIndex("learning_path_nodes", "IDX_NODE_COURSE");
        await queryRunner.dropIndex("node_dependencies", "IDX_DEPENDENCY_SOURCE_TARGET");
        await queryRunner.dropIndex("node_dependencies", "IDX_DEPENDENCY_TYPE");
        await queryRunner.dropIndex("learning_objectives", "IDX_OBJECTIVE_TYPE");
        await queryRunner.dropIndex("learning_objectives", "IDX_OBJECTIVE_DOMAIN");
        await queryRunner.dropIndex("learning_path_enrollments", "IDX_ENROLLMENT_USER_PATH");
        await queryRunner.dropIndex("learning_path_enrollments", "IDX_ENROLLMENT_STATUS");
        await queryRunner.dropIndex("node_progress", "IDX_PROGRESS_ENROLLMENT_NODE");
        await queryRunner.dropIndex("node_progress", "IDX_PROGRESS_STATUS");
        await queryRunner.dropIndex("learning_path_templates", "IDX_TEMPLATE_CATEGORY");
        await queryRunner.dropIndex("learning_path_templates", "IDX_TEMPLATE_PUBLIC");

        // Drop foreign keys
        const learningPathsTable = await queryRunner.getTable("learning_paths");
        const learningPathNodesTable = await queryRunner.getTable("learning_path_nodes");
        const nodeDependenciesTable = await queryRunner.getTable("node_dependencies");
        const learningPathEnrollmentsTable = await queryRunner.getTable("learning_path_enrollments");
        const nodeProgressTable = await queryRunner.getTable("node_progress");
        const learningPathTemplatesTable = await queryRunner.getTable("learning_path_templates");
        const nodePrerequisitesTable = await queryRunner.getTable("node_prerequisites");
        const nodeLearningObjectivesTable = await queryRunner.getTable("node_learning_objectives");

        if (learningPathsTable) {
            await queryRunner.dropForeignKeys("learning_paths", learningPathsTable.foreignKeys);
        }

        if (learningPathNodesTable) {
            await queryRunner.dropForeignKeys("learning_path_nodes", learningPathNodesTable.foreignKeys);
        }

        if (nodeDependenciesTable) {
            await queryRunner.dropForeignKeys("node_dependencies", nodeDependenciesTable.foreignKeys);
        }

        if (learningPathEnrollmentsTable) {
            await queryRunner.dropForeignKeys("learning_path_enrollments", learningPathEnrollmentsTable.foreignKeys);
        }

        if (nodeProgressTable) {
            await queryRunner.dropForeignKeys("node_progress", nodeProgressTable.foreignKeys);
        }

        if (learningPathTemplatesTable) {
            await queryRunner.dropForeignKeys("learning_path_templates", learningPathTemplatesTable.foreignKeys);
        }

        if (nodePrerequisitesTable) {
            await queryRunner.dropForeignKeys("node_prerequisites", nodePrerequisitesTable.foreignKeys);
        }

        if (nodeLearningObjectivesTable) {
            await queryRunner.dropForeignKeys("node_learning_objectives", nodeLearningObjectivesTable.foreignKeys);
        }

        // Drop tables
        await queryRunner.dropTable("node_learning_objectives");
        await queryRunner.dropTable("node_prerequisites");
        await queryRunner.dropTable("learning_path_templates");
        await queryRunner.dropTable("node_progress");
        await queryRunner.dropTable("learning_path_enrollments");
        await queryRunner.dropTable("learning_objectives");
        await queryRunner.dropTable("node_dependencies");
        await queryRunner.dropTable("learning_path_nodes");
        await queryRunner.dropTable("learning_paths");
    }
}