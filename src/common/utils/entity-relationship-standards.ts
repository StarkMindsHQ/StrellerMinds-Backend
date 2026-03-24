import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index
} from 'typeorm';

/**
 * Standard Entity Relationship Configuration
 * 
 * This file defines the standard patterns and configurations
 * for all entity relationships in the StrellerMinds backend.
 */

export interface StandardEntityFields {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface StandardAuditFields {
  createdBy?: string;
  updatedBy?: string;
  deletedBy?: string;
}

export interface StandardSoftDeleteFields {
  deletedAt?: Date;
  isDeleted?: boolean;
}

/**
 * Standard relationship naming conventions
 */
export const RELATIONSHIP_NAMES = {
  // User relationships
  USER_CREATED_BY: 'createdBy',
  USER_UPDATED_BY: 'updatedBy', 
  USER_DELETED_BY: 'deletedBy',
  USER_OWNED: 'owner',
  USER_INSTRUCTOR: 'instructor',
  USER_STUDENT: 'student',
  
  // Course relationships
  COURSE_INSTRUCTOR: 'instructor',
  COURSE_STUDENTS: 'students',
  COURSE_MODULES: 'modules',
  COURSE_CATEGORIES: 'categories',
  COURSE_TAGS: 'tags',
  
  // Content relationships
  CONTENT_COURSE: 'course',
  CONTENT_MODULE: 'module',
  CONTENT_VERSION: 'version',
  CONTENT_AUTHOR: 'author',
  
  // Payment relationships
  PAYMENT_USER: 'user',
  PAYMENT_SUBSCRIPTION: 'subscription',
  PAYMENT_INVOICE: 'invoice',
  
  // Assignment relationships
  ASSIGNMENT_COURSE: 'course',
  ASSIGNMENT_STUDENT: 'student',
  ASSIGNMENT_SUBMISSIONS: 'submissions',
} as const;

/**
 * Standard cascade behaviors
 */
export const CASCADE_BEHAVIORS = {
  // Standard cascades
  CASCADE: 'CASCADE',
  SET_NULL: 'SET NULL',
  RESTRICT: 'RESTRICT',
  
  // Soft delete cascades
  SOFT_DELETE: 'CASCADE',
  NO_CASCADE: null,
} as const;

/**
 * Standard foreign key constraints
 */
export const FOREIGN_KEY_CONSTRAINTS = {
  // Standard actions
  ON_DELETE_CASCADE: { onDelete: 'CASCADE' },
  ON_DELETE_SET_NULL: { onDelete: 'SET NULL' },
  ON_DELETE_RESTRICT: { onDelete: 'RESTRICT' },
  
  // Standard nullable
  NULLABLE: { nullable: true },
  NOT_NULLABLE: { nullable: false },
} as const;

/**
 * Standard column configurations
 */
export const STANDARD_COLUMNS = {
  // Primary keys
  UUID_PRIMARY_KEY: () => PrimaryGeneratedColumn('uuid'),
  
  // Timestamps
  CREATED_AT: () => CreateDateColumn(),
  UPDATED_AT: () => UpdateDateColumn(),
  DELETED_AT: () => DeleteDateColumn(),
  
  // Common fields
  TITLE: () => Column(),
  DESCRIPTION: () => Column({ type: 'text' }),
  STATUS: () => Column({ type: 'varchar', default: 'active' }),
  IS_ACTIVE: () => Column({ type: 'boolean', default: true }),
  IS_DELETED: () => Column({ type: 'boolean', default: false }),
  
  // Audit fields
  CREATED_BY: () => Column({ nullable: true }),
  UPDATED_BY: () => Column({ nullable: true }),
  DELETED_BY: () => Column({ nullable: true }),
} as const;

/**
 * Standard index configurations
 */
export const STANDARD_INDEXES = {
  // Common index patterns
  STATUS_CREATED_AT: ['status', 'createdAt'],
  USER_STATUS: ['userId', 'status'],
  COURSE_STATUS: ['courseId', 'status'],
  EMAIL_INDEX: ['email'],
  NAME_INDEX: ['name'],
  DATE_RANGE: ['startDate', 'endDate'],
} as const;

/**
 * Standard soft delete patterns
 */
export const SOFT_DELETE_PATTERNS = {
  // Query decorators
  WHERE_NOT_DELETED: (alias: string = '') => `${alias ? alias + '.' : ''}deletedAt IS NULL`,
  WHERE_NOT_DELETED_BOOLEAN: (alias: string = '') => `${alias ? alias + '.' : ''}isDeleted = false`,
  
  // Repository methods
  FIND_ACTIVE: (alias: string = '') => `${alias ? alias + '.' : ''}deletedAt IS NULL`,
  FIND_INACTIVE: (alias: string = '') => `${alias ? alias + '.' : ''}deletedAt IS NOT NULL`,
} as const;

/**
 * Validation decorators for entity relationships
 */
export const RELATIONSHIP_VALIDATION = {
  // Required relationships
  REQUIRED: { 
    nullable: false,
    onDelete: 'CASCADE' as const,
  },
  
  // Optional relationships
  OPTIONAL: {
    nullable: true,
    onDelete: 'SET NULL' as const,
  },
  
  // Self-referencing relationships
  SELF_REFERENCING: {
    nullable: true,
    onDelete: 'RESTRICT' as const,
  },
} as const;

/**
 * Helper function to create standard ManyToOne relationship
 */
export function createStandardManyToOne<T>(
  typeEntity: () => any,
  options: {
    name?: string;
    nullable?: boolean;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
    eager?: boolean;
  } = {}
) {
  return ManyToOne(typeEntity, {
    name: options.name,
    nullable: options.nullable ?? true,
    onDelete: options.onDelete ?? 'SET NULL',
    eager: options.eager ?? false,
    ...options,
  });
}

/**
 * Helper function to create standard OneToMany relationship
 */
export function createStandardOneToMany<T>(
  typeEntity: () => any,
  options: {
    // Add any valid OneToMany options here
  } = {}
) {
  // return OneToMany(typeEntity, options);
}

/**
 * Helper function to create standard ManyToMany relationship
 */
export function createStandardManyToMany<T>(
  typeEntity: () => any,
  options: any = {}
) {
  return ManyToMany(typeEntity, options);
}

/**
 * Entity relationship documentation generator
 */
export class EntityRelationshipDocumentation {
  static generateRelationshipDoc(
    entityName: string,
    relationships: Array<{
      name: string;
      type: 'ManyToOne' | 'OneToMany' | 'ManyToMany';
      targetEntity: string;
      cascade?: string;
      onDelete?: string;
      nullable?: boolean;
    }>
  ): string {
    let doc = `# ${entityName} Entity Relationships\n\n`;
    
    relationships.forEach((rel, index) => {
      doc += `## ${index + 1}. ${rel.name}\n\n`;
      doc += `**Type:** ${rel.type}\n`;
      doc += `**Target:** ${rel.targetEntity}\n`;
      doc += `**Cascade:** ${rel.cascade || 'None'}\n`;
      doc += `**On Delete:** ${rel.onDelete || 'No Action'}\n`;
      doc += `**Nullable:** ${rel.nullable ? 'Yes' : 'No'}\n\n`;
    });
    
    doc += `---\n\n*Generated on: ${new Date().toISOString()}*\n`;
    return doc;
  }
  
  static generateEntityStandardDoc(): string {
    return `# Entity Relationship Standards\n\n` +
      `## Naming Conventions\n` +
      `- Use descriptive, singular names for relationships\n` +
      `- Follow the pattern: [entity][relationship] (e.g., courseInstructor, userCourses)\n` +
      `- Use camelCase for property names\n` +
      `- Use PascalCase for type definitions\n\n` +
      
      `## Cascade Behaviors\n` +
      `- **CASCADE**: Delete related entities when parent is deleted\n` +
      `- **SET NULL**: Set foreign key to NULL when parent is deleted\n` +
      `- **RESTRICT**: Prevent deletion if related entities exist\n\n` +
      
      `## Foreign Key Constraints\n` +
      `- Always specify onDelete behavior\n` +
      `- Use nullable: true for optional relationships\n` +
      `- Use nullable: false for required relationships\n\n` +
      
      `## Soft Delete Patterns\n` +
      `- Use deletedAt timestamp for soft deletes\n` +
      `- Use isDeleted boolean flag for performance\n` +
      `- Add indexes on deletedAt for query performance\n\n` +
      
      `## Audit Fields\n` +
      `- createdBy: User who created the record\n` +
      `- updatedBy: User who last updated the record\n` +
      `- deletedBy: User who deleted the record (soft delete)\n\n`;
  }
}
