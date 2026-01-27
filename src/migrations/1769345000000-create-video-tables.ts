import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateVideoTables1769345000000 implements MigrationInterface {
    name = 'CreateVideoTables1769345000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."videos_status_enum" AS ENUM('PENDING', 'PROCESSING', 'READY', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "videos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "originalFileId" character varying, "hlsManifestPath" character varying, "thumbnailPath" character varying, "duration" numeric(10,2) NOT NULL DEFAULT '0', "status" "public"."videos_status_enum" NOT NULL DEFAULT 'PENDING', "ownerId" character varying NOT NULL, "views" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e4c8d9e9e9e9e9e9e9e9e9e9e9" PRIMARY KEY ("id"))`);

        await queryRunner.query(`CREATE TABLE "video_chapters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "videoId" uuid NOT NULL, "title" character varying NOT NULL, "startTime" numeric(10,2) NOT NULL, "endTime" numeric(10,2) NOT NULL, CONSTRAINT "PK_d8f8f8f8f8f8f8f8f8f8f8f8f8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "video_quizzes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "videoId" uuid NOT NULL, "question" character varying NOT NULL, "options" jsonb NOT NULL, "correctAnswer" character varying NOT NULL, "timestamp" numeric(10,2) NOT NULL, CONSTRAINT "PK_c7c7c7c7c7c7c7c7c7c7c7c7c7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "video_analytics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "videoId" uuid NOT NULL, "userId" character varying NOT NULL, "watchTime" numeric(10,2) NOT NULL DEFAULT '0', "completed" boolean NOT NULL DEFAULT false, "lastPosition" numeric(10,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b6b6b6b6b6b6b6b6b6b6b6b6b6" PRIMARY KEY ("id"))`);

        await queryRunner.query(`ALTER TABLE "video_chapters" ADD CONSTRAINT "FK_a5a5a5a5a5a5a5a5a5a5a5a5a5" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "video_quizzes" ADD CONSTRAINT "FK_94949494949494949494949494" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "video_analytics" ADD CONSTRAINT "FK_83838383838383838383838383" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "video_analytics" DROP CONSTRAINT "FK_83838383838383838383838383"`);
        await queryRunner.query(`ALTER TABLE "video_quizzes" DROP CONSTRAINT "FK_94949494949494949494949494"`);
        await queryRunner.query(`ALTER TABLE "video_chapters" DROP CONSTRAINT "FK_a5a5a5a5a5a5a5a5a5a5a5a5a5"`);
        await queryRunner.query(`DROP TABLE "video_analytics"`);
        await queryRunner.query(`DROP TABLE "video_quizzes"`);
        await queryRunner.query(`DROP TABLE "video_chapters"`);
        await queryRunner.query(`DROP TABLE "videos"`);
        await queryRunner.query(`DROP TYPE "public"."videos_status_enum"`);
    }
}
