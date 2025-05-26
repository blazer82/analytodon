import { AccountEntity, UserEntity, UserRole } from '@analytodon/shared-orm';
import { Controller, Get, HttpCode, HttpStatus, Logger, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { CheckAccount } from '../auth/decorators/check-account.decorator';
import { GetAccount } from '../auth/decorators/get-account.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccountOwnerGuard } from '../auth/guards/account-owner.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ChartDataPointDto } from '../shared/dto/chart-data-point.dto';
import { TimeframeQueryDto } from '../shared/dto/timeframe-query.dto';
import { TotalSnapshotDto } from '../shared/dto/total-snapshot.dto';
import { FavoritedTootDto } from './dto/favorited-toot.dto';
import { FavoritesKpiDto } from './dto/favorites-kpi.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, AccountOwnerGuard)
@CheckAccount({ requireSetupComplete: true }) // Apply to all routes in this controller
@Controller('accounts/:accountId/favorites')
export class FavoritesController {
  private readonly logger = new Logger(FavoritesController.name);
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get('kpi/weekly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get weekly Key Performance Indicators (KPIs) for an account's favorites" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Weekly favorites KPI data.', type: FavoritesKpiDto })
  async getWeeklyKpi(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @GetUser() user: UserEntity,
  ): Promise<FavoritesKpiDto> {
    this.logger.log(`Getting weekly favorites KPI for account ${account.id}, user ${user.id}`);
    const kpiData = await this.favoritesService.getWeeklyKpi(account);
    return { ...kpiData } as FavoritesKpiDto;
  }

  @Get('kpi/monthly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get monthly Key Performance Indicators (KPIs) for an account's favorites" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Monthly favorites KPI data.', type: FavoritesKpiDto })
  async getMonthlyKpi(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @GetUser() user: UserEntity,
  ): Promise<FavoritesKpiDto> {
    this.logger.log(`Getting monthly favorites KPI for account ${account.id}, user ${user.id}`);
    const kpiData = await this.favoritesService.getMonthlyKpi(account);
    return { ...kpiData } as FavoritesKpiDto;
  }

  @Get('kpi/yearly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get yearly Key Performance Indicators (KPIs) for an account's favorites" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Yearly favorites KPI data.', type: FavoritesKpiDto })
  async getYearlyKpi(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @GetUser() user: UserEntity,
  ): Promise<FavoritesKpiDto> {
    this.logger.log(`Getting yearly favorites KPI for account ${account.id}, user ${user.id}`);
    const kpiData = await this.favoritesService.getYearlyKpi(account);
    return { ...kpiData } as FavoritesKpiDto;
  }

  @Get('kpi/total')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get total snapshot of an account's favorites" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Total favorites snapshot data.',
    type: TotalSnapshotDto,
  })
  async getTotalSnapshot(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @GetUser() user: UserEntity,
  ): Promise<TotalSnapshotDto | null> {
    this.logger.log(`Getting total favorites snapshot for account ${account.id}, user ${user.id}`);
    const snapshotData = await this.favoritesService.getTotalSnapshot(account);
    if (!snapshotData) {
      return null;
    }
    return { ...snapshotData } as TotalSnapshotDto;
  }

  @Get('chart')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get chart data for an account's favorites over a specified timeframe" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Favorites chart data.', type: [ChartDataPointDto] })
  async getChartData(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<ChartDataPointDto[]> {
    this.logger.log(
      `Getting favorites chart data for account ${account.id}, timeframe ${query.timeframe}, user ${user.id}`,
    );
    const chartInternalData = await this.favoritesService.getChartData(account, query.timeframe);
    return chartInternalData.map((point) => ({ ...point }) as ChartDataPointDto);
  }

  @Get('top-toots')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: 'Get top toots by favorites for an account over a specified timeframe' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of top toots by favorites.', type: [FavoritedTootDto] })
  async getTopTootsByFavorites(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<FavoritedTootDto[]> {
    this.logger.log(
      `Getting top toots by favorites for account ${account.id}, timeframe ${query.timeframe}, user ${user.id}`,
    );
    const rankedEntities = await this.favoritesService.getTopTootsByFavorites(account, query.timeframe);
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
        }) as FavoritedTootDto,
    );
  }

  @Get('csv')
  @Roles(UserRole.AccountOwner)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export favorites data as CSV for an account over a specified timeframe' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'CSV file of favorites data.' })
  async exportCsv(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Exporting favorites CSV for account ${account.id}, timeframe ${query.timeframe}, user ${user.id}`);
    await this.favoritesService.exportCsv(account, query.timeframe, res);
  }
}
