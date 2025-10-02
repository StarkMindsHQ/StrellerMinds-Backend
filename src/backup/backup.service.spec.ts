/* eslint-disable prettier/prettier */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BackupService } from './backup.service';
import { BackupVerificationService } from './backup-verification.service';
import { BackupRetentionService } from './backup-retention.service';
import { EmailService } from '../email/email.service';
import * as fs from 'fs/promises';
import * as child_process from 'child_process';

jest.mock('fs/promises');
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, opts, cb) => cb?.(null, { stdout: '' }, null)),
}));

describe('BackupService', () => {
  let service: BackupService;
  let emailService: EmailService;
  let verificationService: BackupVerificationService;
  let retentionService: BackupRetentionService;
  let configService: ConfigService;

  beforeEach(async () => {
    const emailServiceMock = { sendImmediate: jest.fn().mockResolvedValue(true) };
    const verificationServiceMock = { verifyDatabaseBackup: jest.fn().mockResolvedValue(true) };
    const retentionServiceMock = { cleanupOldBackups: jest.fn().mockResolvedValue(undefined) };
    const configServiceMock = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config = {
          BACKUP_DIR: './test-backups',
          BACKUP_ADMIN_EMAIL: 'admin@example.com',
          'database.host': 'localhost',
          'database.port': 5432,
          'database.user': 'postgres',
          'database.password': 'password',
          'database.name': 'test_db',
        };
        return config[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: BackupVerificationService, useValue: verificationServiceMock },
        { provide: BackupRetentionService, useValue: retentionServiceMock },
        { provide: EmailService, useValue: emailServiceMock },
      ],
    }).compile();

    service = module.get<BackupService>(BackupService);
    emailService = module.get<EmailService>(EmailService);
    verificationService = module.get<BackupVerificationService>(BackupVerificationService);
    retentionService = module.get<BackupRetentionService>(BackupRetentionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create database backup and verify it', async () => {
    (fs.stat as jest.Mock).mockResolvedValue({ size: 1234 });
    (child_process.exec as unknown as jest.Mock).mockImplementation((cmd, opts, cb) =>
      cb(null, { stdout: '' }, null),
    );
    const verifySpy = jest
      .spyOn(verificationService, 'verifyDatabaseBackup')
      .mockResolvedValue(true);
    const result = await service.createDatabaseBackup();
    expect(result.success).toBe(true);
    expect(verifySpy).toHaveBeenCalled();
  });

  it('should call sendBackupFailureAlert if verification fails', async () => {
    (fs.stat as jest.Mock).mockResolvedValue({ size: 1234 });
    (child_process.exec as unknown as jest.Mock).mockImplementation((cmd, opts, cb) =>
      cb(null, { stdout: '' }, null),
    );
    jest.spyOn(verificationService, 'verifyDatabaseBackup').mockResolvedValue(false);
    const alertSpy = jest
      .spyOn<any, any>(service, 'sendBackupFailureAlert')
      .mockImplementation(jest.fn());
    await service.createDatabaseBackup();
    expect(alertSpy).toHaveBeenCalledWith('Backup verification failed');
  });

  it('should call sendBackupFailureAlert if backup throws error', async () => {
    (child_process.exec as unknown as jest.Mock).mockImplementation((cmd, opts, cb) =>
      cb(new Error('fail'), null, null),
    );
    const alertSpy = jest
      .spyOn<any, any>(service, 'sendBackupFailureAlert')
      .mockImplementation(jest.fn());
    await service.createDatabaseBackup();
    expect(alertSpy).toHaveBeenCalled();
  });

  it('should call retention cleanup after scheduled backup', async () => {
    (fs.stat as jest.Mock).mockResolvedValue({ size: 1234 });
    (child_process.exec as unknown as jest.Mock).mockImplementation((cmd, opts, cb) =>
      cb(null, { stdout: '' }, null),
    );
    jest.spyOn(verificationService, 'verifyDatabaseBackup').mockResolvedValue(true);
    const cleanupSpy = jest.spyOn(retentionService, 'cleanupOldBackups');
    await service.scheduledDatabaseBackup();
    expect(cleanupSpy).toHaveBeenCalled();
  });

  it('should send email to admin on backup failure', async () => {
    const emailSpy = jest.spyOn(emailService, 'sendImmediate');
    await (service as any).sendBackupFailureAlert('test error');
    expect(emailSpy).toHaveBeenCalledWith({
      to: 'admin@example.com',
      subject: 'Backup Failure Alert',
      templateName: 'backup-failure',
      context: expect.objectContaining({ error: 'test error' }),
    });
  });

  it('should list backups', async () => {
    const backups = await service.listBackups();
    expect(Array.isArray(backups)).toBe(true);
  });
});
