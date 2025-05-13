import { Controller, Get, UseGuards } from '@nestjs/common';

import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../shared/enums/user-role.enum';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Example of an admin-only route
  @Get('admin-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  adminRouteTest(@GetUser() user: UserEntity): string {
    return `Hello Admin ${user.email}! This is an admin-only route.`;
  }

  // Define other controller methods for user routes here
  // e.g., GET /users/:id, POST /users
}
