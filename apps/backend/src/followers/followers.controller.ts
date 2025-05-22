import { Controller, Get, HttpCode, HttpStatus, Logger, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { AccountEntity } from '../accounts/entities/account.entity';
import { CheckAccount } from '../auth/decorators/check-account.decorator';
import { GetAccount } from '../auth/decorators/get-account.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccountOwnerGuard } from '../auth/guards/account-owner.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ChartDataPointDto } from '../boosts/dto/chart-data-point.dto';
import { TimeframeQueryDto } from '../boosts/dto/timeframe-query.dto';
import { TotalSnapshotDto } from '../boosts/dto/total-snapshot.dto';
import { UserRole } from '../shared/enums/user-role.enum';
import { UserEntity } from '../users/entities/user.entity';
import { FollowersKpiDto } from './dto/followers-kpi.dto';
import { FollowersService } from './followers.service';

@ApiTags('Followers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, AccountOwnerGuard)
@CheckAccount({ requireSetupComplete: true }) // Apply to all routes in this controller
@Controller('accounts/:accountId/followers')
export class FollowersController {
  private readonly logger = new Logger(FollowersController.name);
  constructor(private readonly followersService: FollowersService) {}

  @Get('kpi/weekly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get weekly Key Performance Indicators (KPIs) for an account's followers" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Weekly followers KPI data.', type: FollowersKpiDto })
  async getWeeklyKpi(
    @Param('accountId') accountIdParam: string, // Renamed to avoid conflict if needed, or use GetAccount's result
    @GetAccount() account: AccountEntity,
    @GetUser() user: UserEntity,
  ): Promise<FollowersKpiDto> {
    this.logger.log(`Getting weekly followers KPI for account ${account.id}, user ${user.id}`);
    return this.followersService.getWeeklyKpi(account);
  }

  @Get('kpi/monthly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get monthly Key Performance Indicators (KPIs) for an account's followers" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Monthly followers KPI data.', type: FollowersKpiDto })
  async getMonthlyKpi(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @GetUser() user: UserEntity,
  ): Promise<FollowersKpiDto> {
    this.logger.log(`Getting monthly followers KPI for account ${account.id}, user ${user.id}`);
    return this.followersService.getMonthlyKpi(account);
  }

  @Get('kpi/yearly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get yearly Key Performance Indicators (KPIs) for an account's followers" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Yearly followers KPI data.', type: FollowersKpiDto })
  async getYearlyKpi(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @GetUser() user: UserEntity,
  ): Promise<FollowersKpiDto> {
    this.logger.log(`Getting yearly followers KPI for account ${account.id}, user ${user.id}`);
    return this.followersService.getYearlyKpi(account);
  }

  @Get('kpi/total')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get total snapshot of an account's followers" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Total followers snapshot data.',
    type: TotalSnapshotDto,
  })
  async getTotalSnapshot(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @GetUser() user: UserEntity,
  ): Promise<TotalSnapshotDto | null> {
    this.logger.log(`Getting total followers snapshot for account ${account.id}, user ${user.id}`);
    return this.followersService.getTotalSnapshot(account);
  }

  @Get('chart')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get chart data for an account's followers over a specified timeframe" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Followers chart data.', type: [ChartDataPointDto] })
  async getChartData(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<ChartDataPointDto[]> {
    this.logger.log(
      `Getting followers chart data for account ${account.id}, timeframe ${query.timeframe}, user ${user.id}`,
    );
    return this.followersService.getChartData(account, query.timeframe);
  }

  @Get('csv')
  @Roles(UserRole.AccountOwner)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export followers data as CSV for an account over a specified timeframe' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'CSV file of followers data.' })
  async exportCsv(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Exporting followers CSV for account ${account.id}, timeframe ${query.timeframe}, user ${user.id}`);
    await this.followersService.exportCsv(account, query.timeframe, res);
  }
}
