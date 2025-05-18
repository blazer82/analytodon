import { Controller, Get, HttpCode, HttpStatus, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ChartDataPointDto } from '../boosts/dto/chart-data-point.dto'; // Reusing from boosts
import { TimeframeQueryDto } from '../boosts/dto/timeframe-query.dto'; // Reusing from boosts
import { TotalSnapshotDto } from '../boosts/dto/total-snapshot.dto'; // Reusing from boosts
import { UserRole } from '../shared/enums/user-role.enum';
import { UserEntity } from '../users/entities/user.entity';
import { FavoritedTootDto } from './dto/favorited-toot.dto';
import { FavoritesKpiDto } from './dto/favorites-kpi.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounts/:accountId/favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get('kpi/weekly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get weekly Key Performance Indicators (KPIs) for an account's favorites" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Weekly favorites KPI data.', type: FavoritesKpiDto })
  async getWeeklyKpi(@Param('accountId') accountId: string, @GetUser() user: UserEntity): Promise<FavoritesKpiDto> {
    const kpiData = await this.favoritesService.getWeeklyKpi(accountId, user);
    return { ...kpiData } as FavoritesKpiDto;
  }

  @Get('kpi/monthly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get monthly Key Performance Indicators (KPIs) for an account's favorites" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Monthly favorites KPI data.', type: FavoritesKpiDto })
  async getMonthlyKpi(@Param('accountId') accountId: string, @GetUser() user: UserEntity): Promise<FavoritesKpiDto> {
    const kpiData = await this.favoritesService.getMonthlyKpi(accountId, user);
    return { ...kpiData } as FavoritesKpiDto;
  }

  @Get('kpi/yearly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get yearly Key Performance Indicators (KPIs) for an account's favorites" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Yearly favorites KPI data.', type: FavoritesKpiDto })
  async getYearlyKpi(@Param('accountId') accountId: string, @GetUser() user: UserEntity): Promise<FavoritesKpiDto> {
    const kpiData = await this.favoritesService.getYearlyKpi(accountId, user);
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
    @Param('accountId') accountId: string,
    @GetUser() user: UserEntity,
  ): Promise<TotalSnapshotDto | null> {
    const snapshotData = await this.favoritesService.getTotalSnapshot(accountId, user);
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
    @Param('accountId') accountId: string,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<ChartDataPointDto[]> {
    const chartInternalData = await this.favoritesService.getChartData(accountId, query.timeframe, user);
    return chartInternalData.map((point) => ({ ...point }) as ChartDataPointDto);
  }

  @Get('top-toots')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: 'Get top toots by favorites for an account over a specified timeframe' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of top toots by favorites.', type: [FavoritedTootDto] })
  async getTopTootsByFavorites(
    @Param('accountId') accountId: string,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<FavoritedTootDto[]> {
    const rankedEntities = await this.favoritesService.getTopTootsByFavorites(accountId, query.timeframe, user);
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
    @Param('accountId') accountId: string,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
    @Res() res: Response,
  ): Promise<void> {
    await this.favoritesService.exportCsv(accountId, query.timeframe, user, res);
  }
}
