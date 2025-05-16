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
import { RepliedTootDto } from './dto/replied-toot.dto';
import { RepliesKpiDto } from './dto/replies-kpi.dto';
import { RepliesService } from './replies.service';

@ApiTags('Replies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounts/:accountId/replies')
export class RepliesController {
  constructor(private readonly repliesService: RepliesService) {}

  @Get('kpi/weekly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get weekly Key Performance Indicators (KPIs) for an account's replies" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Weekly replies KPI data.', type: RepliesKpiDto })
  async getWeeklyKpi(@Param('accountId') accountId: string, @GetUser() user: UserEntity): Promise<RepliesKpiDto> {
    return this.repliesService.getWeeklyKpi(accountId, user);
  }

  @Get('kpi/monthly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get monthly Key Performance Indicators (KPIs) for an account's replies" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Monthly replies KPI data.', type: RepliesKpiDto })
  async getMonthlyKpi(@Param('accountId') accountId: string, @GetUser() user: UserEntity): Promise<RepliesKpiDto> {
    return this.repliesService.getMonthlyKpi(accountId, user);
  }

  @Get('kpi/yearly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get yearly Key Performance Indicators (KPIs) for an account's replies" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Yearly replies KPI data.', type: RepliesKpiDto })
  async getYearlyKpi(@Param('accountId') accountId: string, @GetUser() user: UserEntity): Promise<RepliesKpiDto> {
    return this.repliesService.getYearlyKpi(accountId, user);
  }

  @Get('kpi/total')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get total snapshot of an account's replies" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Total replies snapshot data.',
    type: TotalSnapshotDto,
  })
  async getTotalSnapshot(
    @Param('accountId') accountId: string,
    @GetUser() user: UserEntity,
  ): Promise<TotalSnapshotDto | null> {
    return this.repliesService.getTotalSnapshot(accountId, user);
  }

  @Get('chart')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get chart data for an account's replies over a specified timeframe" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Replies chart data.', type: [ChartDataPointDto] })
  async getChartData(
    @Param('accountId') accountId: string,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<ChartDataPointDto[]> {
    return this.repliesService.getChartData(accountId, query.timeframe, user);
  }

  @Get('top-toots')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: 'Get top toots by replies for an account over a specified timeframe' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of top toots by replies.', type: [RepliedTootDto] })
  async getTopTootsByReplies(
    @Param('accountId') accountId: string,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<RepliedTootDto[]> {
    return this.repliesService.getTopTootsByReplies(accountId, query.timeframe, user);
  }

  @Get('csv')
  @Roles(UserRole.AccountOwner)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export replies data as CSV for an account over a specified timeframe' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'CSV file of replies data.' })
  async exportCsv(
    @Param('accountId') accountId: string,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
    @Res() res: Response,
  ): Promise<void> {
    await this.repliesService.exportCsv(accountId, query.timeframe, user, res);
  }
}
