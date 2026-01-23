import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePaymentTables1704890000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Payments table
    await queryRunner.createTable(
      new Table({
        name: 'payments',
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
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'currency',
            type: 'varchar',
            default: "'USD'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'disputed'],
            default: "'pending'",
          },
          {
            name: 'paymentMethod',
            type: 'enum',
            enum: ['stripe', 'paypal', 'credit_card', 'bank_transfer', 'cryptocurrency'],
          },
          {
            name: 'transactionId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'gatewayReferenceId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'failureReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'invoiceId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'subscriptionId',
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
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );

    // Payment Plans table
    await queryRunner.createTable(
      new Table({
        name: 'payment_plans',
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
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'currency',
            type: 'varchar',
            default: "'USD'",
          },
          {
            name: 'billingCycle',
            type: 'enum',
            enum: ['monthly', 'quarterly', 'semi_annual', 'annual', 'custom'],
            default: "'monthly'",
          },
          {
            name: 'trialDays',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'maxSubscribers',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'features',
            type: 'jsonb',
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
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    // Subscriptions table
    await queryRunner.createTable(
      new Table({
        name: 'subscriptions',
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
            name: 'paymentPlanId',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'paused', 'cancelled', 'expired', 'pending', 'failed'],
            default: "'pending'",
          },
          {
            name: 'billingCycle',
            type: 'enum',
            enum: ['monthly', 'quarterly', 'semi_annual', 'annual', 'custom'],
          },
          {
            name: 'currentAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'externalSubscriptionId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'startDate',
            type: 'timestamp',
          },
          {
            name: 'nextBillingDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'endDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'cancelledAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'cancellationReason',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'failedPaymentCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['paymentPlanId'],
            referencedTableName: 'payment_plans',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );

    // Invoices table
    await queryRunner.createTable(
      new Table({
        name: 'invoices',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'invoiceNumber',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'subscriptionId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'subtotal',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'tax',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'discount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'total',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'currency',
            type: 'varchar',
            default: "'USD'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'issued', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded'],
            default: "'draft'",
          },
          {
            name: 'dueDate',
            type: 'timestamp',
          },
          {
            name: 'paidAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'amountPaid',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'lineItems',
            type: 'jsonb',
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
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('invoices');
    await queryRunner.dropTable('subscriptions');
    await queryRunner.dropTable('payment_plans');
    await queryRunner.dropTable('payments');
  }
}
