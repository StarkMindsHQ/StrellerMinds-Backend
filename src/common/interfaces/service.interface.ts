import { PaginationOptions, PaginatedResult } from '../services/base.service';

/**
 * Base interface for all CRUD services
 */
export interface ICrudService<T, CreateDto, UpdateDto> {
  create(createDto: CreateDto): Promise<T>;
  findAll(options?: PaginationOptions): Promise<PaginatedResult<T>>;
  findOne(id: string, relations?: string[]): Promise<T>;
  update(id: string, updateDto: UpdateDto): Promise<T>;
  delete(id: string): Promise<void>;
}

/**
 * Interface for services that need to find entities by specific criteria
 */
export interface ISearchableService<T> {
  findByEmail(email: string): Promise<T | undefined>;
  findById(id: string): Promise<T | undefined>;
  findByCriteria(criteria: Record<string, any>): Promise<T[]>;
}

/**
 * Interface for services that handle user-related operations
 */
export interface IUserService<T> extends ICrudService<T, any, any>, ISearchableService<T> {
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
  updateRefreshToken(userId: string, refreshToken: string | null): Promise<void>;
  validateCredentials(email: string, password: string): Promise<boolean>;
}

/**
 * Interface for services that handle course-related operations
 */
export interface ICourseService<T, CreateDto, UpdateDto> extends ICrudService<T, CreateDto, UpdateDto> {
  enrollUser(courseId: string, userId: string): Promise<void>;
  unenrollUser(courseId: string, userId: string): Promise<void>;
  getEnrolledUsers(courseId: string): Promise<any[]>;
  getCourseProgress(courseId: string, userId: string): Promise<number>;
}

/**
 * Interface for services that handle file operations
 */
export interface IFileService<T> {
  upload(file: Express.Multer.File): Promise<T>;
  download(fileId: string): Promise<Buffer>;
  delete(fileId: string): Promise<void>;
  getFileInfo(fileId: string): Promise<T>;
}

/**
 * Interface for services that handle email operations
 */
export interface IEmailService {
  sendEmail(to: string, subject: string, content: string): Promise<void>;
  sendTemplateEmail(to: string, template: string, context: Record<string, any>): Promise<void>;
  sendBulkEmail(recipients: string[], subject: string, content: string): Promise<void>;
}

/**
 * Interface for services that handle payment operations
 */
export interface IPaymentService {
  processPayment(paymentData: any): Promise<any>;
  refundPayment(paymentId: string, amount: number): Promise<any>;
  getPaymentStatus(paymentId: string): Promise<string>;
  validatePaymentMethod(paymentMethod: any): Promise<boolean>;
}

/**
 * Interface for services that handle notification operations
 */
export interface INotificationService {
  sendNotification(userId: string, message: string, type: string): Promise<void>;
  sendBulkNotification(userIds: string[], message: string, type: string): Promise<void>;
  markAsRead(notificationId: string): Promise<void>;
  getUserNotifications(userId: string): Promise<any[]>;
}

/**
 * Interface for services that handle audit logging
 */
export interface IAuditService {
  logAction(userId: string, action: string, resource: string, details?: any): Promise<void>;
  getAuditLogs(filters?: any): Promise<any[]>;
  exportAuditLogs(format: string, dateRange?: { start: Date; end: Date }): Promise<any>;
}

/**
 * Interface for services that handle caching
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getKeys(pattern: string): Promise<string[]>;
}
