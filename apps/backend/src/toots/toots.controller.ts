import { AccountEntity, UserEntity, UserRole } from '@analytodon/shared-orm';
import { Controller, Get, HttpStatus, Logger, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

// To get account timezone // No longer needed directly if GetAccount provides it
import { CheckAccount } from '../auth/decorators/check-account.decorator';
import { GetAccount } from '../auth/decorators/get-account.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccountOwnerGuard } from '../auth/guards/account-owner.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TimeframeQueryDto } from '../shared/dto/timeframe-query.dto';
import { resolveTimeframe } from '../shared/utils/timeframe.helper';
import { AllTopTootsResponseDto } from './dto/all-top-toots-response.dto';
import { TootRankingEnum } from './dto/get-top-toots-query.dto';
import { RankedTootDto } from './dto/ranked-toot.dto';
import { RankedTootEntity, TootsService } from './toots.service';

@ApiTags('Toots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, AccountOwnerGuard)
@Controller('accounts/:accountId/toots')
export class TootsController {
  private readonly logger = new Logger(TootsController.name);
  constructor(private readonly tootsService: TootsService) {}

  @Get('top-summary')
  @Roles(UserRole.AccountOwner)
  @CheckAccount({ requireSetupComplete: true })
  @ApiOperation({ summary: 'Get a summary of top toots by various rankings for an account' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Summary of top toots.', type: AllTopTootsResponseDto })
  async getTopTootsSummary(
    @Param('accountId') accountIdParam: string, // accountId is in path, used by guard
    @GetAccount() account: AccountEntity, // Get the account from the guard
    @Query() query: TimeframeQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<AllTopTootsResponseDto> {
    this.logger.log(
      `Getting top toots summary for account ${account.id}, timeframe ${query.timeframe}, user ${user.id}`,
    );
    // const account = await this.accountsService.findByIdOrFail(accountId, user, true); // No longer needed

    const { dateFrom, dateTo, timeframe: resolvedTimeframe } = resolveTimeframe(account.timezone, query.timeframe);
    const limit = 10; // As per legacy
    const accountId = account.id; // Use id from the loaded account

    const mapToRankedTootDto = (toots: RankedTootEntity[]): RankedTootDto[] => {
      return toots.map((toot) => ({
        id: toot._id.toString(), // Ensure _id is converted to string id
        content: toot.content,
        url: toot.url,
        reblogsCount: toot.reblogsCount,
        repliesCount: toot.repliesCount,
        favouritesCount: toot.favouritesCount,
        createdAt: toot.createdAt,
        rank: toot.rank,
      }));
    };

    const [topEntities, topByRepliesEntities, topByBoostsEntities, topByFavoritesEntities] = await Promise.all([
      this.tootsService.getTopToots({ accountId, ranking: TootRankingEnum.TOP, dateFrom, dateTo, limit }),
      this.tootsService.getTopToots({ accountId, ranking: TootRankingEnum.REPLIES, dateFrom, dateTo, limit }),
      this.tootsService.getTopToots({ accountId, ranking: TootRankingEnum.BOOSTS, dateFrom, dateTo, limit }),
      this.tootsService.getTopToots({ accountId, ranking: TootRankingEnum.FAVOURITES, dateFrom, dateTo, limit }),
    ]);

    return {
      top: { data: mapToRankedTootDto(topEntities), timeframe: resolvedTimeframe },
      topByReplies: { data: mapToRankedTootDto(topByRepliesEntities), timeframe: resolvedTimeframe },
      topByBoosts: { data: mapToRankedTootDto(topByBoostsEntities), timeframe: resolvedTimeframe },
      topByFavorites: { data: mapToRankedTootDto(topByFavoritesEntities), timeframe: resolvedTimeframe },
    };
  }
}
