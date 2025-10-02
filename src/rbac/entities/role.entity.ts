import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Entity representing a role in the RBAC system.
 */
@Entity('roles')
export class Role {
  /** Unique role ID */
  @ApiProperty({ description: 'Unique role ID', example: 'uuid-role' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Role name */
  @ApiProperty({ description: 'Role name', example: 'admin' })
  @Column({ unique: true })
  name: string;

  /** Role description */
  @ApiProperty({ description: 'Role description', required: false })
  @Column({ nullable: true })
  description: string;

  /** Parent role ID (for role hierarchy) */
  @ApiProperty({ description: 'Parent role ID', required: false })
  @Column({ nullable: true })
  parentRoleId: string;
}
