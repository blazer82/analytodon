import { Controller, Get, HttpStatus, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AccountsService } from '../accounts/accounts.service'; // To get account timezone
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TimeframeQueryDto } from '../boosts/dto/timeframe-query.dto'; // Re-use from boosts or create a shared one
import { UserRole } from '../shared/enums/user-role.enum';
import { resolveTimeframe } from '../shared/utils/timeframe.helper';
import { UserEntity } from '../users/entities/user.entity';
import { AllTopTootsResponseDto } from './dto/all-top-toots-response.dto';
import { TootRankingEnum } from './dto/get-top-toots-query.dto';
import { TootsService } from './toots.service';

@ApiTags('Toots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounts/:accountId/toots')
export class TootsController {
  constructor(
    private readonly tootsService: TootsService,
    private readonly accountsService: AccountsService, // Inject AccountsService
  ) {}

  @Get('top-summary')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: 'Get a summary of top toots by various rankings for an account' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Summary of top toots.', type: AllTopTootsResponseDto })
  async getTopTootsSummary(
    @Param('accountId') accountId: string,
    @Query() query: TimeframeQueryDto, // Using TimeframeQueryDto from boosts for now
    @GetUser() user: UserEntity,
  ): Promise<AllTopTootsResponseDto> {
    const account = await this.accountsService.findById(accountId, user);
    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found or not owned by user.`);
    }

    const { dateFrom, dateTo, timeframe: resolvedTimeframe } = resolveTimeframe(account.timezone, query.timeframe);
    const limit = 10; // As per legacy

    const [top, topByReplies, topByBoosts, topByFavorites] = await Promise.all([
      this.tootsService.getTopToots({ accountId, ranking: TootRankingEnum.TOP, dateFrom, dateTo, limit }),
      this.tootsService.getTopToots({ accountId, ranking: TootRankingEnum.REPLIES, dateFrom, dateTo, limit }),
      this.tootsService.getTopToots({ accountId, ranking: TootRankingEnum.BOOSTS, dateFrom, dateTo, limit }),
      this.tootsService.getTopToots({ accountId, ranking: TootRankingEnum.FAVOURITES, dateFrom, dateTo, limit }),
    ]);

    return {
      top: { data: top, timeframe: resolvedTimeframe },
      topByReplies: { data: topByReplies, timeframe: resolvedTimeframe },
      topByBoosts: { data: topByBoosts, timeframe: resolvedTimeframe },
      topByFavorites: { data: topByFavorites, timeframe: resolvedTimeframe },
    };
  }
}
