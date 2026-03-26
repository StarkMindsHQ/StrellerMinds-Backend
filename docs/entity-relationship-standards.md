# Entity Relationship Standards

## Overview

This document defines the standard patterns and conventions for entity relationships in the StrellerMinds backend to ensure consistency, maintainability, and performance across the entire codebase.

## Table of Contents

1. [Naming Conventions](#naming-conventions)
2. [Cascade Behaviors](#cascade-behaviors)
3. [Foreign Key Constraints](#foreign-key-constraints)
4. [Soft Delete Patterns](#soft-delete-patterns)
5. [Indexing Strategy](#indexing-strategy)
6. [Audit Fields](#audit-fields)
7. [Performance Considerations](#performance-considerations)
8. [Migration Guidelines](#migration-guidelines)

## Naming Conventions

### Relationship Property Names

Follow these patterns for consistent naming:

```typescript
// ManyToOne: Use target entity name
@ManyToOne(() => User)
user: User;

@ManyToOne(() => Course)
course: Course;

// OneToMany: Use plural form
@OneToMany(() => Enrollment)
enrollments: Enrollment[];

@OneToMany(() => CourseModule)
modules: CourseModule[];

// ManyToMany: Use plural form
@ManyToMany(() => Tag)
tags: Tag[];

@ManyToMany(() => Category)
categories: Category[];
```

### Foreign Key Column Names

```typescript
// Use [entity]Id pattern
@Column({ name: 'userId' })
userId: string;

@Column({ name: 'courseId' })
courseId: string;

@Column({ name: 'instructorId' })
instructorId: string;
```

### Join Table Names

```typescript
// Use [entity1]_[entity2] pattern
@JoinTable({ name: 'course_students' })
@ManyToMany(() => Student)
students: Student[];

@JoinTable({ name: 'user_roles' })
@ManyToMany(() => Role)
roles: Role[];
```

## Cascade Behaviors

### Cascade Configuration

```typescript
// Use appropriate cascade behaviors
@OneToMany(() => Comment, { cascade: ['insert', 'update'] })
comments: Comment[];

@OneToMany(() => OrderItem, { cascade: ['insert', 'update', 'remove'] })
orderItems: OrderItem[];

// Be explicit about cascade behavior
@ManyToOne(() => User, { 
  cascade: true, // All operations
  onDelete: 'CASCADE' 
})
user: User;

@ManyToOne(() => Category, { 
  cascade: false, // No cascading
  onDelete: 'SET NULL' 
})
category: Category;
```

### Cascade Best Practices

- **Use `CASCADE` sparingly** - Only when child entities should not exist without parent
- **Prefer `SET NULL`** - For optional relationships to prevent accidental data loss
- **Use `RESTRICT`** - For critical relationships to prevent orphaned records
- **Document cascade behavior** - Add comments explaining why cascade is needed

## Foreign Key Constraints

### OnDelete Behaviors

```typescript
// CASCADE - Delete related records
@ManyToOne(() => User, { onDelete: 'CASCADE' })
user: User;

// SET NULL - Set foreign key to null
@ManyToOne(() => Category, { onDelete: 'SET NULL' })
category: Category;

// RESTRICT - Prevent deletion if related records exist
@ManyToOne(() => Course, { onDelete: 'RESTRICT' })
course: Course;
```

### Nullability Configuration

```typescript
// Required relationships
@ManyToOne(() => User, { nullable: false })
user: User;

// Optional relationships
@ManyToOne(() => Category, { nullable: true })
category: Category;
```

### Join Column Configuration

```typescript
// Always specify join columns
@ManyToOne(() => User)
@JoinColumn({ name: 'userId' })
user: User;

// Custom join column names
@ManyToOne(() => Course)
@JoinColumn({ 
  name: 'instructorId',
  referencedColumnName: 'id'
})
course: Course;
```

## Soft Delete Patterns

### Implementation

```typescript
@Entity()
export class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;
}
```

### Query Patterns

```typescript
// Find active records
repository.find({
  where: {
    deletedAt: IsNull(), // Using soft delete
    isActive: true,
  },
});

// Find inactive records
repository.find({
  where: {
    deletedAt: NotNull(),
    isActive: false,
  },
});

// Include soft-deleted records
repository.find({
  withDeleted: true, // TypeORM soft delete
});
```

### Soft Delete Best Practices

- **Use both `deletedAt` and `isDeleted`** - Timestamp for queries, boolean for performance
- **Add indexes on `deletedAt`** - Improves query performance
- **Implement cascade soft delete** - Soft delete related entities
- **Document restore behavior** - Clearly define how to restore deleted records

## Indexing Strategy

### Foreign Key Indexes

```typescript
@Entity()
@Index(['userId']) // Foreign key
@Index(['courseId']) // Foreign key
@Index(['status', 'createdAt']) // Composite for queries
export class Enrollment {
  // ... entity definition
}
```

### Relationship-Specific Indexes

```typescript
// ManyToOne relationships
@ManyToOne(() => User)
@JoinColumn({ name: 'userId' })
@Index(['userId']) // Index foreign key
user: User;

// OneToMany relationships
@OneToMany(() => Enrollment, { mappedBy: 'student' })
@Index(['studentId']) // Index mappedBy property
enrollments: Enrollment[];

// ManyToMany relationships
@ManyToMany(() => Tag, { 
  joinTable: { name: 'course_tags' },
  joinColumn: { name: 'courseId' },
  inverseJoinColumn: { name: 'tagId' }
})
@Index(['id']) // Index primary key for join table
tags: Tag[];
```

## Audit Fields

### Standard Audit Fields

```typescript
@Entity()
export class AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: string; // User who created

  @Column({ nullable: true })
  updatedBy: string; // User who last updated

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ nullable: true })
  deletedBy: string; // User who deleted
}
```

### Audit Implementation

```typescript
// Automatic audit field population
@Entity()
export class Course {
  // ... other fields

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updatedBy' })
  updater: User;
}
```

## Performance Considerations

### Eager Loading

```typescript
// Use eager loading sparingly
@ManyToOne(() => User, { eager: false }) // Default - lazy loading
user: User;

@ManyToOne(() => UserProfile, { eager: true }) // Only for frequently accessed data
userProfile: UserProfile;
```

### Batch Operations

```typescript
// Use batch operations for performance
await repository.save(entities); // Batch insert
await repository.remove(entities); // Batch delete

// Use transactions for consistency
await manager.transaction(async manager => {
  await manager.save(entity1);
  await manager.save(entity2);
  await manager.save(entity3);
});
```

### Query Optimization

```typescript
// Select specific columns
repository.find({
  select: ['id', 'title', 'status'], // Only needed columns
});

// Use limits for large datasets
repository.find({
  take: 100,
  skip: 0,
});

// Use appropriate joins
repository.find({
  relations: ['user', 'course'], // Only needed relations
});
```

## Migration Guidelines

### Adding Relationships

1. **Analyze impact** - Consider existing data and queries
2. **Create migration** - Generate proper TypeORM migration
3. **Update indexes** - Add necessary database indexes
4. **Test thoroughly** - Verify data integrity
5. **Update documentation** - Document new relationships

### Removing Relationships

1. **Check dependencies** - Ensure no foreign key constraints
2. **Create migration** - Handle existing data properly
3. **Update queries** - Modify affected service methods
4. **Add tests** - Ensure functionality works
5. **Monitor performance** - Watch for query degradation

### Standardization Process

1. **Run analysis script** - `npm run analyze:entities`
2. **Review findings** - Check issues and recommendations
3. **Apply fixes** - Use standardization helpers
4. **Run tests** - Verify changes don't break functionality
5. **Update documentation** - Keep docs in sync with code

## Tools and Utilities

### Analysis Script

Run the entity analysis script to identify issues:

```bash
npm run analyze:entities
```

### Standardization Helpers

Use the provided utility functions:

```typescript
import { 
  createStandardManyToOne,
  createStandardOneToMany,
  createStandardManyToMany,
  STANDARD_COLUMNS,
  CASCADE_BEHAVIORS
} from '../common/utils/entity-relationship-standards';

// Create standard relationships
@ManyToOne(() => User, createStandardManyToOne(User, {
  onDelete: 'SET NULL',
  nullable: true
}))
user: User;

@OneToMany(() => Course, createStandardOneToMany(Course, {
  mappedBy: 'instructor',
  cascade: ['insert', 'update']
}))
courses: Course[];
```

## Validation Rules

### Required Validations

- [ ] All ManyToOne relationships have @JoinColumn
- [ ] All ManyToMany relationships have @JoinTable
- [ ] Foreign keys are properly indexed
- [ ] Cascade behavior is explicitly defined
- [ ] Soft delete patterns are consistent
- [ ] Audit fields are implemented where needed

### Optional Validations

- [ ] Relationship names follow naming conventions
- [ ] Join table names follow patterns
- [ ] Eager loading is used appropriately
- [ ] Performance indexes are optimized
- [ ] Documentation is up to date

## Troubleshooting

### Common Issues

1. **Missing @JoinColumn** - Causes foreign key errors
2. **Incorrect cascade** - Leads to data integrity issues
3. **Missing indexes** - Causes poor query performance
4. **Inconsistent naming** - Makes code harder to maintain

### Solutions

1. **Use standardization helpers** - Prevent common mistakes
2. **Run analysis regularly** - Catch issues early
3. **Follow documentation** - Maintain consistency
4. **Test relationships thoroughly** - Ensure data integrity

---

*Last updated: ${new Date().toISOString()}*
*Version: 1.0.0*
