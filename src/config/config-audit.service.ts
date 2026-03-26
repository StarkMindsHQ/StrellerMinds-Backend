import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface ConfigAuditLog {
  id: string;
  timestamp: Date;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'ENCRYPT' | 'DECRYPT' | 'ROTATE_KEY';
  configKey: string;
  oldValue?: string;
  newValue?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  environment: string;
  version: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface ConfigAuditFilter {
  startDate?: Date;
  endDate?: Date;
  action?: ConfigAuditLog['action'];
  configKey?: string;
  userId?: string;
  success?: boolean;
  environment?: string;
}

@Injectable()
export class ConfigAuditService {
  private readonly logger = new Logger(ConfigAuditService.name);
  private readonly auditLogPath = path.join(process.cwd(), 'logs', 'config-audit.log');
  private readonly maxLogSize = 10 * 1024 * 1024; // 10MB
  private readonly maxLogFiles = 5;

  constructor() {
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.auditLogPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
      this.logger.log(`Created audit log directory: ${logDir}`);
    }
  }

  private generateLogId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private rotateLogIfNeeded(): void {
    try {
      if (!fs.existsSync(this.auditLogPath)) {
        return;
      }

      const stats = fs.statSync(this.auditLogPath);
      if (stats.size < this.maxLogSize) {
        return;
      }

      // Rotate logs
      for (let i = this.maxLogFiles - 1; i > 0; i--) {
        const oldFile = `${this.auditLogPath}.${i}`;
        const newFile = `${this.auditLogPath}.${i + 1}`;
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxLogFiles - 1) {
            fs.unlinkSync(oldFile);
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // Move current log to .1
      const rotatedFile = `${this.auditLogPath}.1`;
      fs.renameSync(this.auditLogPath, rotatedFile);
      
      this.logger.log('Rotated configuration audit log');
    } catch (error) {
      this.logger.error(`Failed to rotate audit log: ${error.message}`);
    }
  }

  private sanitizeValue(value: string): string {
    if (!value) return '';
    
    // Mask sensitive values
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /credential/i,
    ];

    const isSensitive = sensitivePatterns.some(pattern => pattern.test(value));
    
    if (isSensitive && value.length > 8) {
      return value.substring(0, 4) + '***' + value.substring(value.length - 4);
    }
    
    return value;
  }

  private writeLogEntry(logEntry: ConfigAuditLog): void {
    try {
      this.rotateLogIfNeeded();
      
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.auditLogPath, logLine);
      
      this.logger.debug(`Audit log entry written: ${logEntry.id}`);
    } catch (error) {
      this.logger.error(`Failed to write audit log entry: ${error.message}`);
    }
  }

  logConfigChange(
    action: ConfigAuditLog['action'],
    configKey: string,
    oldValue?: string,
    newValue?: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>,
  ): void {
    const logEntry: ConfigAuditLog = {
      id: this.generateLogId(),
      timestamp: new Date(),
      action,
      configKey,
      oldValue: this.sanitizeValue(oldValue),
      newValue: this.sanitizeValue(newValue),
      userId,
      ipAddress,
      userAgent,
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || '1.0.0',
      success: true,
      metadata,
    };

    this.writeLogEntry(logEntry);
    
    // Also log to application logger for immediate visibility
    this.logger.log(
      `Config ${action}: ${configKey} by ${userId || 'system'} (${logEntry.id})`
    );
  }

  logConfigError(
    action: ConfigAuditLog['action'],
    configKey: string,
    errorMessage: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>,
  ): void {
    const logEntry: ConfigAuditLog = {
      id: this.generateLogId(),
      timestamp: new Date(),
      action,
      configKey,
      userId,
      ipAddress,
      userAgent,
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || '1.0.0',
      success: false,
      errorMessage,
      metadata,
    };

    this.writeLogEntry(logEntry);
    
    this.logger.error(
      `Config ${action} failed: ${configKey} - ${errorMessage} (${logEntry.id})`
    );
  }

  async getAuditLogs(filter?: ConfigAuditFilter): Promise<ConfigAuditLog[]> {
    try {
      if (!fs.existsSync(this.auditLogPath)) {
        return [];
      }

      const logs: ConfigAuditLog[] = [];
      const logContent = fs.readFileSync(this.auditLogPath, 'utf8');
      const lines = logContent.trim().split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const logEntry: ConfigAuditLog = JSON.parse(line);
          
          // Apply filters
          if (filter) {
            if (filter.startDate && new Date(logEntry.timestamp) < filter.startDate) continue;
            if (filter.endDate && new Date(logEntry.timestamp) > filter.endDate) continue;
            if (filter.action && logEntry.action !== filter.action) continue;
            if (filter.configKey && !logEntry.configKey.includes(filter.configKey)) continue;
            if (filter.userId && logEntry.userId !== filter.userId) continue;
            if (filter.success !== undefined && logEntry.success !== filter.success) continue;
            if (filter.environment && logEntry.environment !== filter.environment) continue;
          }
          
          logs.push(logEntry);
        } catch (parseError) {
          this.logger.warn(`Failed to parse audit log line: ${parseError.message}`);
        }
      }

      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      this.logger.error(`Failed to read audit logs: ${error.message}`);
      return [];
    }
  }

  async getAuditLogById(id: string): Promise<ConfigAuditLog | null> {
    try {
      const logs = await this.getAuditLogs();
      return logs.find(log => log.id === id) || null;
    } catch (error) {
      this.logger.error(`Failed to get audit log by ID: ${error.message}`);
      return null;
    }
  }

  async getConfigHistory(configKey: string, limit: number = 50): Promise<ConfigAuditLog[]> {
    try {
      const logs = await this.getAuditLogs({ configKey });
      return logs.slice(0, limit);
    } catch (error) {
      this.logger.error(`Failed to get config history: ${error.message}`);
      return [];
    }
  }

  async getUserActivity(userId: string, limit: number = 100): Promise<ConfigAuditLog[]> {
    try {
      const logs = await this.getAuditLogs({ userId });
      return logs.slice(0, limit);
    } catch (error) {
      this.logger.error(`Failed to get user activity: ${error.message}`);
      return [];
    }
  }

  async getFailedOperations(limit: number = 50): Promise<ConfigAuditLog[]> {
    try {
      const logs = await this.getAuditLogs({ success: false });
      return logs.slice(0, limit);
    } catch (error) {
      this.logger.error(`Failed to get failed operations: ${error.message}`);
      return [];
    }
  }

  async getAuditStatistics(): Promise<{
    totalLogs: number;
    successfulOperations: number;
    failedOperations: number;
    operationsByAction: Record<string, number>;
    operationsByEnvironment: Record<string, number>;
    recentActivity: ConfigAuditLog[];
  }> {
    try {
      const logs = await this.getAuditLogs();
      const successfulOperations = logs.filter(log => log.success).length;
      const failedOperations = logs.filter(log => !log.success).length;
      
      const operationsByAction = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const operationsByEnvironment = logs.reduce((acc, log) => {
        acc[log.environment] = (acc[log.environment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const recentActivity = logs.slice(0, 10);

      return {
        totalLogs: logs.length,
        successfulOperations,
        failedOperations,
        operationsByAction,
        operationsByEnvironment,
        recentActivity,
      };
    } catch (error) {
      this.logger.error(`Failed to get audit statistics: ${error.message}`);
      return {
        totalLogs: 0,
        successfulOperations: 0,
        failedOperations: 0,
        operationsByAction: {},
        operationsByEnvironment: {},
        recentActivity: [],
      };
    }
  }

  async exportAuditLogs(outputPath: string, filter?: ConfigAuditFilter): Promise<void> {
    try {
      const logs = await this.getAuditLogs(filter);
      const exportData = {
        exportedAt: new Date().toISOString(),
        filter: filter || {},
        totalLogs: logs.length,
        logs,
      };
      
      fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
      this.logger.log(`Exported ${logs.length} audit logs to: ${outputPath}`);
    } catch (error) {
      this.logger.error(`Failed to export audit logs: ${error.message}`);
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const logs = await this.getAuditLogs();
      const logsToKeep = logs.filter(log => new Date(log.timestamp) >= cutoffDate);
      
      // Rewrite the log file with only recent logs
      const logLines = logsToKeep.map(log => JSON.stringify(log)).join('\n');
      fs.writeFileSync(this.auditLogPath, logLines + '\n');
      
      const deletedCount = logs.length - logsToKeep.length;
      this.logger.log(`Cleaned up ${deletedCount} old audit log entries (older than ${retentionDays} days)`);
      
      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to cleanup old audit logs: ${error.message}`);
      return 0;
    }
  }
}
