import { Controller, Get, HttpCode, HttpStatus, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
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
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounts/:accountId/followers')
export class FollowersController {
  constructor(private readonly followersService: FollowersService) {}

  @Get('kpi/weekly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get weekly Key Performance Indicators (KPIs) for an account's followers" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Weekly followers KPI data.', type: FollowersKpiDto })
  async getWeeklyKpi(@Param('accountId') accountId: string, @GetUser() user: UserEntity): Promise<FollowersKpiDto> {
    return this.followersService.getWeeklyKpi(accountId, user);
  }

  @Get('kpi/monthly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get monthly Key Performance Indicators (KPIs) for an account's followers" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Monthly followers KPI data.', type: FollowersKpiDto })
  async getMonthlyKpi(@Param('accountId') accountId: string, @GetUser() user: UserEntity): Promise<FollowersKpiDto> {
    return this.followersService.getMonthlyKpi(accountId, user);
  }

  @Get('kpi/yearly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get yearly Key Performance Indicators (KPIs) for an account's followers" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Yearly followers KPI data.', type: FollowersKpiDto })
  async getYearlyKpi(@Param('accountId') accountId: string, @GetUser() user: UserEntity): Promise<FollowersKpiDto> {
    return this.followersService.getYearlyKpi(accountId, user);
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
    @Param('accountId') accountId: string,
    @GetUser() user: UserEntity,
  ): Promise<TotalSnapshotDto | null> {
    return this.followersService.getTotalSnapshot(accountId, user);
  }

  @Get('chart')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get chart data for an account's followers over a specified timeframe" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Followers chart data.', type: [ChartDataPointDto] })
  async getChartData(
    @Param('accountId') accountId: string,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<ChartDataPointDto[]> {
    return this.followersService.getChartData(accountId, query.timeframe, user);
  }

  @Get('csv')
  @Roles(UserRole.AccountOwner)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export followers data as CSV for an account over a specified timeframe' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'CSV file of followers data.' })
  async exportCsv(
    @Param('accountId') accountId: string,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
    @Res() res: Response,
  ): Promise<void> {
    await this.followersService.exportCsv(accountId, query.timeframe, user, res);
  }
}
