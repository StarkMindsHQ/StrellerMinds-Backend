import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateFileTables1735200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create files table
    await queryRunner.createTable(
      new Table({
        name: 'files',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'filename',
            type: 'varchar',
          },
          {
            name: 'originalName',
            type: 'varchar',
          },
          {
            name: 'mimeType',
            type: 'varchar',
          },
          {
            name: 'size',
            type: 'bigint',
          },
          {
            name: 'path',
            type: 'varchar',
          },
          {
            name: 'url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'fileType',
            type: 'enum',
            enum: ['image', 'video', 'document', 'audio', 'other'],
          },
          {
            name: 'uploadedBy',
            type: 'uuid',
          },
          {
            name: 'relatedEntityType',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'relatedEntityId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'metadata',
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
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for files
    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_FILES_FILE_TYPE',
        columnNames: ['fileType'],
      }),
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_FILES_UPLOADED_BY',
        columnNames: ['uploadedBy'],
      }),
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_FILES_CREATED_AT',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_FILES_RELATED_ENTITY',
        columnNames: ['relatedEntityType', 'relatedEntityId'],
      }),
    );

    // Create foreign key for uploadedBy
    await queryRunner.createForeignKey(
      'files',
      new TableForeignKey({
        columnNames: ['uploadedBy'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('files');
  }
}
