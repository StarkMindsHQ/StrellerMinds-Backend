import * as winston from 'winston';

export const winstonConfig = {
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, context }) =>
            `[${timestamp}] ${level} ${context || ''} ${message}`,
        ),
      ),
    }),
    new winston.transports.File({
      filename: 'logs/security.log',
      level: 'warn',
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
  ],
};
