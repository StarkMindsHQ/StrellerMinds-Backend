import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBillingColumns1727650800 implements MigrationInterface {
  name = 'AddBillingColumns1727650800';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // users.stripeCustomerId
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripeCustomerId" varchar`,
    );

    // courses.isPremium
    await queryRunner.query(
      `ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "isPremium" boolean NOT NULL DEFAULT false`,
    );

    // courses.requiredPlan
    // Create enum type if it does not exist (Postgres safeguard)
    await queryRunner.query(`DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscriptionplan') THEN
                CREATE TYPE "subscriptionplan" AS ENUM ('basic','premium','enterprise','student');
            END IF;
        END $$;`);
    await queryRunner.query(
      `ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "requiredPlan" "subscriptionplan"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN IF EXISTS "requiredPlan"`);
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN IF EXISTS "isPremium"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "stripeCustomerId"`);
    // Note: We keep enum type for safety as it may be used elsewhere
  }
}
