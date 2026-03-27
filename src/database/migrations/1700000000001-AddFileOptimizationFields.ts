import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFileOptimizationFields1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'files',
      new TableColumn({
        name: 'originalSize',
        type: 'bigint',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'files',
      new TableColumn({
        name: 'fileHash',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'files',
      new TableColumn({
        name: 'isCompressed',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'files',
      new TableColumn({
        name: 'compressionRatio',
        type: 'decimal',
        precision: 5,
        scale: 4,
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'files',
      new TableColumn({
        name: 'cdnUrl',
        type: 'varchar',
        length: '2048',
        isNullable: true,
      }),
    );

    await queryRunner.createTable(
      `
        CREATE TABLE "chunk_uploads" (
          "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          "uploadId" varchar NOT NULL UNIQUE,
          "userId" varchar NOT NULL,
          "filename" varchar NOT NULL,
          "fileSize" bigint NOT NULL,
          "mimeType" varchar NOT NULL,
          "fileHash" varchar NOT NULL,
          "chunkSize" bigint NOT NULL,
          "totalChunks" integer NOT NULL,
          "uploadedChunks" text[] DEFAULT '{}',
          "isCompleted" boolean DEFAULT false,
          "fileId" varchar,
          "storageProvider" varchar,
          "storagePath" varchar,
          "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
          "expiresAt" timestamp DEFAULT CURRENT_TIMESTAMP
        )
      `,
    );

    await queryRunner.createIndex(
      'chunk_uploads',
      `
        CREATE INDEX "IDX_chunk_uploads_uploadId_userId" 
        ON "chunk_uploads" ("uploadId", "userId")
      `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('files', 'cdnUrl');
    await queryRunner.dropColumn('files', 'compressionRatio');
    await queryRunner.dropColumn('files', 'isCompressed');
    await queryRunner.dropColumn('files', 'fileHash');
    await queryRunner.dropColumn('files', 'originalSize');
    
    await queryRunner.dropTable('chunk_uploads');
  }
}
