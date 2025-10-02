/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

@Injectable()
export class BackupVerificationService {
  private readonly logger = new Logger(BackupVerificationService.name);
  private readonly dbConfig: any;

  constructor(private readonly configService: ConfigService) {
    this.dbConfig = {
      host: this.configService.get<string>('database.host'),
      port: this.configService.get<number>('database.port'),
      username: this.configService.get<string>('database.user'),
      password: this.configService.get<string>('database.password'),
      database: this.configService.get<string>('database.name'),
    };
  }

  async verifyDatabaseBackup(backupPath: string): Promise<boolean> {
    try {
      // Check if file exists and is not empty
      const stats = await fs.stat(backupPath);
      if (stats.size === 0) {
        this.logger.error(`Backup file is empty: ${backupPath}`);
        return false;
      }

      // Verify SQL syntax by doing a dry run
      const testDbName = `${this.dbConfig.database}_backup_test`;
      const env = { ...process.env, PGPASSWORD: this.dbConfig.password };

      try {
        // Create test database
        await execAsync(
          `createdb -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.username} ${testDbName}`,
          { env },
        );

        // Try to restore backup to test database
        await execAsync(
          `psql -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.username} -d ${testDbName} -f "${backupPath}" --quiet`,
          { env },
        );

        // Verify some basic tables exist
        const { stdout } = await execAsync(
          `psql -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.username} -d ${testDbName} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"`,
          { env },
        );

        const tableCount = parseInt(stdout.trim());
        if (tableCount === 0) {
          this.logger.error('Backup verification failed: No tables found');
          return false;
        }

        this.logger.log(`Backup verification successful: ${tableCount} tables restored`);
        return true;
      } finally {
        // Clean up test database
        try {
          await execAsync(
            `dropdb -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.username} ${testDbName}`,
            { env },
          );
        } catch (cleanupError) {
          this.logger.warn(`Failed to cleanup test database: ${cleanupError.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Backup verification failed: ${error.message}`, error.stack);
      return false;
    }
  }

  async verifyApplicationDataBackup(backupPath: string): Promise<boolean> {
    try {
      // Check if tar.gz file is valid
      await execAsync(`tar -tzf "${backupPath}" > /dev/null`);
      this.logger.log(`Application data backup verification successful: ${backupPath}`);
      return true;
    } catch (error) {
      this.logger.error(`Application data backup verification failed: ${error.message}`);
      return false;
    }
  }
}
