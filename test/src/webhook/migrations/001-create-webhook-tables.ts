import { type MigrationInterface, type QueryRunner, Table, Index } from "typeorm"

export class CreateWebhookTables1703001000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create webhooks table
    await queryRunner.createTable(
      new Table({
        name: "webhooks",
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
            length: "255",
          },
          {
            name: "url",
            type: "text",
          },
          {
            name: "events",
            type: "text",
          },
          {
            name: "status",
            type: "enum",
            enum: ["active", "inactive", "failed"],
            default: "'active'",
          },
          {
            name: "secret",
            type: "text",
            isNullable: true,
          },
          {
            name: "headers",
            type: "json",
            isNullable: true,
          },
          {
            name: "maxRetries",
            type: "int",
            default: 3,
          },
          {
            name: "timeoutSeconds",
            type: "int",
            default: 30,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    )

    // Create webhook_deliveries table
    await queryRunner.createTable(
      new Table({
        name: "webhook_deliveries",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "webhookId",
            type: "uuid",
          },
          {
            name: "event",
            type: "varchar",
            length: "100",
          },
          {
            name: "payload",
            type: "json",
          },
          {
            name: "status",
            type: "enum",
            enum: ["pending", "success", "failed", "retrying"],
            default: "'pending'",
          },
          {
            name: "responseStatus",
            type: "int",
            isNullable: true,
          },
          {
            name: "responseBody",
            type: "text",
            isNullable: true,
          },
          {
            name: "responseHeaders",
            type: "json",
            isNullable: true,
          },
          {
            name: "attempts",
            type: "int",
            default: 0,
          },
          {
            name: "errorMessage",
            type: "text",
            isNullable: true,
          },
          {
            name: "nextRetryAt",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "deliveredAt",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
        foreignKeys: [
          {
            columnNames: ["webhookId"],
            referencedTableName: "webhooks",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
      }),
      true,
    )

    // Create indexes
    await queryRunner.createIndex("webhooks", new Index("IDX_webhooks_status", ["status"]))
    await queryRunner.createIndex("webhooks", new Index("IDX_webhooks_events", ["events"]))
    await queryRunner.createIndex("webhook_deliveries", new Index("IDX_webhook_deliveries_status", ["status"]))
    await queryRunner.createIndex("webhook_deliveries", new Index("IDX_webhook_deliveries_created_at", ["createdAt"]))
    await queryRunner.createIndex("webhook_deliveries", new Index("IDX_webhook_deliveries_webhook_id", ["webhookId"]))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("webhook_deliveries")
    await queryRunner.dropTable("webhooks")
  }
}
