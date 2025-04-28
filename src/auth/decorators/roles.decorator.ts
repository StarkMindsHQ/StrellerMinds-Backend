// src/common/decorators/roles.decorator.ts
import { Role } from '@/role/roles.enum';
import { SetMetadata } from '@nestjs/common';
// import { Role } from 'src/role/roles.enum';
 

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

