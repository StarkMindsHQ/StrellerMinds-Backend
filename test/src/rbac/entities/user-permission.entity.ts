import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('user_permissions')
export class UserPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  permissionId: string;
}
