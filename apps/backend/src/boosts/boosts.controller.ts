import { Controller, Get, HttpCode, HttpStatus, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../shared/enums/user-role.enum';
import { UserEntity } from '../users/entities/user.entity';
import { BoostsService } from './boosts.service';
import { BoostedTootDto } from './dto/boosted-toot.dto';
import { BoostsKpiDto } from './dto/boosts-kpi.dto';
import { ChartDataPointDto } from './dto/chart-data-point.dto';
import { TimeframeQueryDto } from './dto/timeframe-query.dto';
import { TotalSnapshotDto } from './dto/total-snapshot.dto';

@ApiTags('Boosts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard) // Apply to all routes in this controller
@Controller('accounts/:accountId/boosts')
export class BoostsController {
  constructor(private readonly boostsService: BoostsService) {}

  @Get('kpi/weekly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get weekly Key Performance Indicators (KPIs) for an account's boosts" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Weekly boosts KPI data.', type: BoostsKpiDto })
  async getWeeklyKpi(@Param('accountId') accountId: string, @GetUser() user: UserEntity): Promise<BoostsKpiDto> {
    return this.boostsService.getWeeklyKpi(accountId, user);
  }

  @Get('kpi/monthly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get monthly Key Performance Indicators (KPIs) for an account's boosts" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Monthly boosts KPI data.', type: BoostsKpiDto })
  async getMonthlyKpi(@Param('accountId') accountId: string, @GetUser() user: UserEntity): Promise<BoostsKpiDto> {
    return this.boostsService.getMonthlyKpi(accountId, user);
  }

  @Get('kpi/yearly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get yearly Key Performance Indicators (KPIs) for an account's boosts" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Yearly boosts KPI data.', type: BoostsKpiDto })
  async getYearlyKpi(@Param('accountId') accountId: string, @GetUser() user: UserEntity): Promise<BoostsKpiDto> {
    return this.boostsService.getYearlyKpi(accountId, user);
  }

  @Get('kpi/total')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get total snapshot of an account's boosts" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Total boosts snapshot data.',
    type: TotalSnapshotDto,
  })
  async getTotalSnapshot(
    @Param('accountId') accountId: string,
    @GetUser() user: UserEntity,
  ): Promise<TotalSnapshotDto | null> {
    return this.boostsService.getTotalSnapshot(accountId, user);
  }

  @Get('chart')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get chart data for an account's boosts over a specified timeframe" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Boosts chart data.', type: [ChartDataPointDto] })
  async getChartData(
    @Param('accountId') accountId: string,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<ChartDataPointDto[]> {
    return this.boostsService.getChartData(accountId, query.timeframe, user);
  }

  @Get('top-toots')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: 'Get top toots by boosts for an account over a specified timeframe' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of top toots by boosts.', type: [BoostedTootDto] })
  async getTopTootsByBoosts(
    @Param('accountId') accountId: string,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<BoostedTootDto[]> {
    return this.boostsService.getTopTootsByBoosts(accountId, query.timeframe, user);
  }

  @Get('csv')
  @Roles(UserRole.AccountOwner)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export boosts data as CSV for an account over a specified timeframe' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'CSV file of boosts data.' })
  async exportCsv(
    @Param('accountId') accountId: string,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
    @Res() res: Response,
  ): Promise<void> {
    await this.boostsService.exportCsv(accountId, query.timeframe, user, res);
  }
}
