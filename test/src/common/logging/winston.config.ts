import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { ConfigService } from '@nestjs/config';

export interface LoggingConfig {
  level: string;
  format: 'json' | 'text';
  file: {
    enabled: boolean;
    path: string;
    maxSize: string;
    maxFiles: number;
  };
  console: {
    enabled: boolean;
    colorize: boolean;
  };
  errorFile: {
    enabled: boolean;
    path: string;
    maxSize: string;
    maxFiles: number;
  };
}

export class WinstonConfigService {
  private readonly config: LoggingConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      level: this.configService.get<string>('LOG_LEVEL', 'info'),
      format: this.configService.get<'json' | 'text'>('LOG_FORMAT', 'json'),
      file: {
        enabled: this.configService.get<boolean>('LOG_FILE_ENABLED', true),
        path: this.configService.get<string>('LOG_FILE_PATH', 'logs/app-%DATE%.log'),
        maxSize: this.configService.get<string>('LOG_FILE_MAX_SIZE', '20m'),
        maxFiles: this.configService.get<number>('LOG_FILE_MAX_FILES', 14),
      },
      console: {
        enabled: this.configService.get<boolean>('LOG_CONSOLE_ENABLED', true),
        colorize: this.configService.get<boolean>('LOG_CONSOLE_COLORIZE', true),
      },
      errorFile: {
        enabled: this.configService.get<boolean>('LOG_ERROR_FILE_ENABLED', true),
        path: this.configService.get<string>('LOG_ERROR_FILE_PATH', 'logs/error-%DATE%.log'),
        maxSize: this.configService.get<string>('LOG_ERROR_FILE_MAX_SIZE', '20m'),
        maxFiles: this.configService.get<number>('LOG_ERROR_FILE_MAX_FILES', 30),
      },
    };
  }

  createWinstonLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.console.enabled) {
      transports.push(
        new winston.transports.Console({
          level: this.config.level,
          format: this.getConsoleFormat(),
        }),
      );
    }

    // File transport for all logs
    if (this.config.file.enabled) {
      transports.push(
        new DailyRotateFile({
          level: this.config.level,
          filename: this.config.file.path,
          datePattern: 'YYYY-MM-DD',
          maxSize: this.config.file.maxSize,
          maxFiles: this.config.file.maxFiles,
          format: this.getFileFormat(),
          auditFile: 'logs/audit.json',
        }),
      );
    }

    // Error file transport (only errors and above)
    if (this.config.errorFile.enabled) {
      transports.push(
        new DailyRotateFile({
          level: 'error',
          filename: this.config.errorFile.path,
          datePattern: 'YYYY-MM-DD',
          maxSize: this.config.errorFile.maxSize,
          maxFiles: this.config.errorFile.maxFiles,
          format: this.getFileFormat(),
          auditFile: 'logs/error-audit.json',
        }),
      );
    }

    return winston.createLogger({
      level: this.config.level,
      format: this.getBaseFormat(),
      transports,
      exitOnError: false,
      handleExceptions: true,
      handleRejections: true,
    });
  }

  private getBaseFormat(): winston.Logform.Format {
    return winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS',
      }),
      winston.format.errors({ stack: true }),
      winston.format.metadata({
        fillExcept: ['message', 'level', 'timestamp', 'label'],
      }),
    );
  }

  private getConsoleFormat(): winston.Logform.Format {
    const formats = [this.getBaseFormat()];

    if (this.config.console.colorize) {
      formats.push(winston.format.colorize({ all: true }));
    }

    if (this.config.format === 'json') {
      formats.push(winston.format.json());
    } else {
      formats.push(
        winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
          let log = `${timestamp} [${level}] ${message}`;
          
          if (metadata && Object.keys(metadata).length > 0) {
            log += ` ${JSON.stringify(metadata)}`;
          }
          
          if (stack) {
            log += `\n${stack}`;
          }
          
          return log;
        }),
      );
    }

    return winston.format.combine(...formats);
  }

  private getFileFormat(): winston.Logform.Format {
    return winston.format.combine(
      this.getBaseFormat(),
      winston.format.json(),
    );
  }
}
