import { Controller, Get, HttpCode, HttpStatus, Logger, Param, Query, Res, UseGuards } from '@nestjs/common';
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
  private readonly logger = new Logger(BoostsController.name);
  constructor(private readonly boostsService: BoostsService) {}

  @Get('kpi/weekly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get weekly Key Performance Indicators (KPIs) for an account's boosts" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Weekly boosts KPI data.', type: BoostsKpiDto })
  async getWeeklyKpi(@Param('accountId') accountId: string, @GetUser() user: UserEntity): Promise<BoostsKpiDto> {
    this.logger.log(`Getting weekly boosts KPI for account ${accountId}, user ${user.id}`);
    const kpiData = await this.boostsService.getWeeklyKpi(accountId, user);
    return { ...kpiData } as BoostsKpiDto;
  }

  @Get('kpi/monthly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get monthly Key Performance Indicators (KPIs) for an account's boosts" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Monthly boosts KPI data.', type: BoostsKpiDto })
  async getMonthlyKpi(@Param('accountId') accountId: string, @GetUser() user: UserEntity): Promise<BoostsKpiDto> {
    this.logger.log(`Getting monthly boosts KPI for account ${accountId}, user ${user.id}`);
    const kpiData = await this.boostsService.getMonthlyKpi(accountId, user);
    return { ...kpiData } as BoostsKpiDto;
  }

  @Get('kpi/yearly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get yearly Key Performance Indicators (KPIs) for an account's boosts" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Yearly boosts KPI data.', type: BoostsKpiDto })
  async getYearlyKpi(@Param('accountId') accountId: string, @GetUser() user: UserEntity): Promise<BoostsKpiDto> {
    this.logger.log(`Getting yearly boosts KPI for account ${accountId}, user ${user.id}`);
    const kpiData = await this.boostsService.getYearlyKpi(accountId, user);
    return { ...kpiData } as BoostsKpiDto;
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
    this.logger.log(`Getting total boosts snapshot for account ${accountId}, user ${user.id}`);
    const snapshotData = await this.boostsService.getTotalSnapshot(accountId, user);
    if (!snapshotData) {
      return null;
    }
    return { ...snapshotData } as TotalSnapshotDto;
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
    this.logger.log(
      `Getting boosts chart data for account ${accountId}, timeframe ${query.timeframe}, user ${user.id}`,
    );
    const chartInternalData = await this.boostsService.getChartData(accountId, query.timeframe, user);
    return chartInternalData.map((point) => ({ ...point }) as ChartDataPointDto);
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
    this.logger.log(
      `Getting top toots by boosts for account ${accountId}, timeframe ${query.timeframe}, user ${user.id}`,
    );
    const rankedEntities = await this.boostsService.getTopTootsByBoosts(accountId, query.timeframe, user);
    return rankedEntities.map(
      (toot) =>
        ({
          id: toot._id.toString(),
          content: toot.content,
          url: toot.url,
          reblogsCount: toot.reblogsCount,
          repliesCount: toot.repliesCount,
          favouritesCount: toot.favouritesCount,
          createdAt: toot.createdAt,
          rank: toot.rank,
        }) as BoostedTootDto, // Cast needed as BoostedTootDto might not have rank or have it optional
    );
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
    this.logger.log(`Exporting boosts CSV for account ${accountId}, timeframe ${query.timeframe}, user ${user.id}`);
    await this.boostsService.exportCsv(accountId, query.timeframe, user, res);
  }
}
