import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddEmailTrackingFields1706800000000 implements MigrationInterface {
  name = 'AddEmailTrackingFields1706800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new tracking columns
    await queryRunner.addColumns('email_logs', [
      new TableColumn({
        name: 'firstOpenedAt',
        type: 'timestamp',
        isNullable: true,
      }),
      new TableColumn({
        name: 'openCount',
        type: 'int',
        isNullable: false,
        default: 0,
      }),
      new TableColumn({
        name: 'firstClickedAt',
        type: 'timestamp',
        isNullable: true,
      }),
      new TableColumn({
        name: 'clickCount',
        type: 'int',
        isNullable: false,
        default: 0,
      }),
      new TableColumn({
        name: 'clickEvents',
        type: 'jsonb',
        isNullable: true,
      }),
      new TableColumn({
        name: 'trackingEnabled',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
      new TableColumn({
        name: 'trackingToken',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
      new TableColumn({
        name: 'updatedAt',
        type: 'timestamp',
        isNullable: false,
        default: 'now()',
      }),
    ]);

    // Indexes for frequently queried fields
    await queryRunner.createIndex(
      'email_logs',
      new TableIndex({ name: 'IDX_email_logs_firstOpenedAt', columnNames: ['firstOpenedAt'] }),
    );
    await queryRunner.createIndex(
      'email_logs',
      new TableIndex({ name: 'IDX_email_logs_firstClickedAt', columnNames: ['firstClickedAt'] }),
    );
    await queryRunner.createIndex(
      'email_logs',
      new TableIndex({ name: 'IDX_email_logs_trackingEnabled', columnNames: ['trackingEnabled'] }),
    );
    await queryRunner.createIndex(
      'email_logs',
      new TableIndex({ name: 'IDX_email_logs_trackingToken', columnNames: ['trackingToken'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('email_logs', 'IDX_email_logs_trackingToken');
    await queryRunner.dropIndex('email_logs', 'IDX_email_logs_trackingEnabled');
    await queryRunner.dropIndex('email_logs', 'IDX_email_logs_firstClickedAt');
    await queryRunner.dropIndex('email_logs', 'IDX_email_logs_firstOpenedAt');

    await queryRunner.dropColumn('email_logs', 'updatedAt');
    await queryRunner.dropColumn('email_logs', 'trackingToken');
    await queryRunner.dropColumn('email_logs', 'trackingEnabled');
    await queryRunner.dropColumn('email_logs', 'clickEvents');
    await queryRunner.dropColumn('email_logs', 'clickCount');
    await queryRunner.dropColumn('email_logs', 'firstClickedAt');
    await queryRunner.dropColumn('email_logs', 'openCount');
    await queryRunner.dropColumn('email_logs', 'firstOpenedAt');
  }
}
