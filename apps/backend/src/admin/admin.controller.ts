import { UserRole } from '@analytodon/shared-orm';
import { Controller, Get, HttpStatus, Logger, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminHealthService } from './admin-health.service';
import { AdminSystemHealthService } from './admin-system-health.service';
import { AdminService } from './admin.service';
import { AccountHealthResponseDto } from './dto/account-health-response.dto';
import { AdminStatsResponseDto } from './dto/admin-stats-response.dto';
import { SystemHealthResponseDto } from './dto/system-health-response.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@ApiBearerAuth()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly adminHealthService: AdminHealthService,
    private readonly adminSystemHealthService: AdminSystemHealthService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform overview statistics (Admin)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Platform statistics retrieved.', type: AdminStatsResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden resource.' })
  async getStats(): Promise<AdminStatsResponseDto> {
    this.logger.log('Admin requesting platform stats');
    return this.adminService.getStats();
  }

  @Get('accounts/health')
  @ApiOperation({ summary: 'Get account health report (Admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account health report retrieved.',
    type: AccountHealthResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden resource.' })
  async getAccountHealth(): Promise<AccountHealthResponseDto> {
    this.logger.log('Admin requesting account health report');
    return this.adminHealthService.getAccountHealth();
  }

  @Get('system/health')
  @ApiOperation({ summary: 'Get system health report (Admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System health report retrieved.',
    type: SystemHealthResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden resource.' })
  async getSystemHealth(): Promise<SystemHealthResponseDto> {
    this.logger.log('Admin requesting system health report');
    return this.adminSystemHealthService.getSystemHealth();
  }
}
