import winston from "winston";

export const securityLogger = winston.createLogger({
  level: "warn",
  transports: [
    new winston.transports.File({ filename: "security.log" }),
  ],
});