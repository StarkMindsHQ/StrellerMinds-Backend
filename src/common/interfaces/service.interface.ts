import { PaginationOptions, PaginatedResult } from '../services/base.service';
import { UploadedFileLike } from '../types/uploaded-file-like';

// Common DTOs and Types
export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
}

export interface CourseDto {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCourseDto {
  title: string;
  description: string;
  instructorId: string;
}

export interface UpdateCourseDto {
  title?: string;
  description?: string;
  isPublished?: boolean;
}

export interface FileDto {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  createdAt: Date;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface EmailContext {
  [key: string]: string | number | boolean;
}

export interface PaymentData {
  amount: number;
  currency: string;
  paymentMethodId: string;
  customerId: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  id: string;
  status: 'succeeded' | 'pending' | 'failed' | 'canceled';
  amount: number;
  currency: string;
  transactionId?: string;
  errorMessage?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'paypal';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface NotificationDto {
  id: string;
  userId: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface AuditLogDto {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface CacheOptions {
  ttl?: number;
  strategy?: 'LRU' | 'LFU' | 'FIFO';
  maxSize?: number;
}

export interface NotificationMetadata {
  priority?: 'low' | 'normal' | 'high';
  category?: string;
  tags?: string[];
  expiresAt?: Date;
  actionUrl?: string;
}

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
export interface IUserService<T>
  extends ICrudService<T, CreateUserDto, UpdateUserDto>,
    ISearchableService<T> {
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
  updateRefreshToken(userId: string, refreshToken: string | null): Promise<void>;
  validateCredentials(email: string, password: string): Promise<boolean>;
}

/**
 * Interface for services that handle course-related operations
 */
export interface ICourseService<T, CreateDto, UpdateDto>
  extends ICrudService<T, CreateDto, UpdateDto> {
  enrollUser(courseId: string, userId: string): Promise<void>;
  unenrollUser(courseId: string, userId: string): Promise<void>;
  getEnrolledUsers(courseId: string): Promise<UserDto[]>;
  getCourseProgress(courseId: string, userId: string): Promise<number>;
}

/**
 * Interface for services that handle file operations
 */
export interface IFileService<T> {
  upload(file: UploadedFileLike): Promise<FileDto>;
  download(fileId: string): Promise<Buffer>;
  delete(fileId: string): Promise<void>;
  getFileInfo(fileId: string): Promise<FileDto>;
}

/**
 * Interface for services that handle email operations
 */
export interface IEmailService {
  sendEmail(to: string, subject: string, content: string): Promise<void>;
  sendTemplateEmail(to: string, template: string, context: EmailContext): Promise<void>;
  sendBulkEmail(recipients: string[], subject: string, content: string): Promise<void>;
  getEmailTemplate(templateName: string): Promise<EmailTemplate>;
  createEmailTemplate(template: EmailTemplate): Promise<void>;
}

/**
 * Interface for services that handle payment operations
 */
export interface IPaymentService {
  processPayment(paymentData: PaymentData): Promise<PaymentResult>;
  refundPayment(paymentId: string, amount: number): Promise<PaymentResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentResult['status']>;
  validatePaymentMethod(paymentMethod: PaymentMethod): Promise<boolean>;
  getPaymentMethod(customerId: string): Promise<PaymentMethod[]>;
  createPaymentMethod(
    customerId: string,
    paymentMethod: Omit<PaymentMethod, 'id'>,
  ): Promise<PaymentMethod>;
}

/**
 * Interface for services that handle notification operations
 */
export interface INotificationService {
  sendNotification(
    userId: string,
    message: string,
    type: NotificationDto['type'],
    metadata?: NotificationMetadata,
  ): Promise<void>;
  sendBulkNotification(
    userIds: string[],
    message: string,
    type: NotificationDto['type'],
    metadata?: NotificationMetadata,
  ): Promise<void>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  getUserNotifications(
    userId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<NotificationDto>>;
  getUnreadCount(userId: string): Promise<number>;
  deleteNotification(notificationId: string): Promise<void>;
}

/**
 * Interface for services that handle audit logging
 */
export interface IAuditService {
  logAction(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>,
  ): Promise<void>;
  getAuditLogs(
    filters?: Partial<AuditLogDto>,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<AuditLogDto>>;
  exportAuditLogs(
    format: 'json' | 'csv' | 'xlsx',
    dateRange?: { start: Date; end: Date },
  ): Promise<Buffer>;
  getAuditLogById(logId: string): Promise<AuditLogDto>;
  deleteAuditLogs(dateRange: { start: Date; end: Date }): Promise<number>;
}

/**
 * Interface for services that handle caching
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<number>;
  clear(): Promise<void>;
  getKeys(pattern: string): Promise<string[]>;
  exists(key: string): Promise<boolean>;
  getTTL(key: string): Promise<number>;
  setTTL(key: string, ttl: number): Promise<void>;
  getStats(): Promise<{ hits: number; misses: number; keys: number; memory: number }>;
}
