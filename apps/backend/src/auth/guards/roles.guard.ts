import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRole } from '../../shared/enums/user-role.enum';
import { UserEntity } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true; // No roles defined, access granted
    }
    const { user } = context.switchToHttp().getRequest<{ user: UserEntity }>();
    if (!user || !user.role) {
      return false; // No user or user role, access denied
    }
    return requiredRoles.some((role) => user.role === role);
  }
}
