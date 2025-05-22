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
@UseGuards(JwtAuthGuard, RolesGuard, AccountOwnerGuard)
@CheckAccount({ requireSetupComplete: true }) // Apply to all routes in this controller
@Controller('accounts/:accountId/replies')
export class RepliesController {
  private readonly logger = new Logger(RepliesController.name);
  constructor(private readonly repliesService: RepliesService) {}

  @Get('kpi/weekly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get weekly Key Performance Indicators (KPIs) for an account's replies" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Weekly replies KPI data.', type: RepliesKpiDto })
  async getWeeklyKpi(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @GetUser() user: UserEntity,
  ): Promise<RepliesKpiDto> {
    this.logger.log(`Getting weekly replies KPI for account ${account.id}, user ${user.id}`);
    return this.repliesService.getWeeklyKpi(account);
  }

  @Get('kpi/monthly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get monthly Key Performance Indicators (KPIs) for an account's replies" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Monthly replies KPI data.', type: RepliesKpiDto })
  async getMonthlyKpi(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @GetUser() user: UserEntity,
  ): Promise<RepliesKpiDto> {
    this.logger.log(`Getting monthly replies KPI for account ${account.id}, user ${user.id}`);
    return this.repliesService.getMonthlyKpi(account);
  }

  @Get('kpi/yearly')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get yearly Key Performance Indicators (KPIs) for an account's replies" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Yearly replies KPI data.', type: RepliesKpiDto })
  async getYearlyKpi(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @GetUser() user: UserEntity,
  ): Promise<RepliesKpiDto> {
    this.logger.log(`Getting yearly replies KPI for account ${account.id}, user ${user.id}`);
    return this.repliesService.getYearlyKpi(account);
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
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @GetUser() user: UserEntity,
  ): Promise<TotalSnapshotDto | null> {
    this.logger.log(`Getting total replies snapshot for account ${account.id}, user ${user.id}`);
    return this.repliesService.getTotalSnapshot(account);
  }

  @Get('chart')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get chart data for an account's replies over a specified timeframe" })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Replies chart data.', type: [ChartDataPointDto] })
  async getChartData(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<ChartDataPointDto[]> {
    this.logger.log(
      `Getting replies chart data for account ${account.id}, timeframe ${query.timeframe}, user ${user.id}`,
    );
    return this.repliesService.getChartData(account, query.timeframe);
  }

  @Get('top-toots')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: 'Get top toots by replies for an account over a specified timeframe' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of top toots by replies.', type: [RepliedTootDto] })
  async getTopTootsByReplies(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<RepliedTootDto[]> {
    this.logger.log(
      `Getting top toots by replies for account ${account.id}, timeframe ${query.timeframe}, user ${user.id}`,
    );
    const rankedEntities = await this.repliesService.getTopTootsByReplies(account, query.timeframe);
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
        }) as RepliedTootDto,
    );
  }

  @Get('csv')
  @Roles(UserRole.AccountOwner)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export replies data as CSV for an account over a specified timeframe' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'CSV file of replies data.' })
  async exportCsv(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Exporting replies CSV for account ${account.id}, timeframe ${query.timeframe}, user ${user.id}`);
    await this.repliesService.exportCsv(account, query.timeframe, res);
  }
}
