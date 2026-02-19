import { AccountEntity, UserEntity, UserRole } from '@analytodon/shared-orm';
import { Controller, Get, HttpStatus, Logger, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CheckAccount } from '../auth/decorators/check-account.decorator';
import { GetAccount } from '../auth/decorators/get-account.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccountOwnerGuard } from '../auth/guards/account-owner.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { HashtagEngagementDto } from './dto/hashtag-engagement.dto';
import { HashtagOverTimeDto } from './dto/hashtag-over-time.dto';
import { HashtagEffectiveQueryDto, HashtagQueryDto } from './dto/hashtag-query.dto';
import { HashtagTopDto } from './dto/hashtag-top.dto';
import { HashtagsService } from './hashtags.service';

@ApiTags('Hashtags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, AccountOwnerGuard)
@CheckAccount({ requireSetupComplete: true })
@Controller('accounts/:accountId/hashtags')
export class HashtagsController {
  private readonly logger = new Logger(HashtagsController.name);
  constructor(private readonly hashtagsService: HashtagsService) {}

  @Get('top')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: 'Get top hashtags by usage for an account over a specified timeframe' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max hashtags to return (default 10)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Top hashtags data.', type: [HashtagTopDto] })
  async getTopHashtags(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @Query() query: HashtagQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<HashtagTopDto[]> {
    this.logger.log(`Getting top hashtags for account ${account.id}, timeframe ${query.timeframe}, user ${user.id}`);
    return this.hashtagsService.getTopHashtags(account, query.timeframe, query.limit ?? 10);
  }

  @Get('over-time')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: 'Get hashtag usage over time for an account' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max hashtags to return (default 10)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Hashtag over time data.', type: HashtagOverTimeDto })
  async getOverTime(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @Query() query: HashtagQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<HashtagOverTimeDto> {
    this.logger.log(
      `Getting hashtag over time for account ${account.id}, timeframe ${query.timeframe}, user ${user.id}`,
    );
    return this.hashtagsService.getOverTime(account, query.timeframe, query.limit ?? 10);
  }

  @Get('engagement')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: 'Get hashtag engagement metrics for an account' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max hashtags to return (default 10)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Hashtag engagement data.', type: [HashtagEngagementDto] })
  async getEngagement(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @Query() query: HashtagQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<HashtagEngagementDto[]> {
    this.logger.log(
      `Getting hashtag engagement for account ${account.id}, timeframe ${query.timeframe}, user ${user.id}`,
    );
    return this.hashtagsService.getEngagement(account, query.timeframe, query.limit ?? 10);
  }

  @Get('most-effective')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: 'Get most effective hashtags by average engagement per toot' })
  @ApiParam({ name: 'accountId', description: 'The ID of the account' })
  @ApiQuery({ name: 'timeframe', required: true, type: String, description: 'e.g., last30days, thismonth' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max hashtags to return (default 10)' })
  @ApiQuery({ name: 'minTootCount', required: false, type: Number, description: 'Min toots required (default 2)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Most effective hashtags data.', type: [HashtagEngagementDto] })
  async getMostEffective(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity,
    @Query() query: HashtagEffectiveQueryDto,
    @GetUser() user: UserEntity,
  ): Promise<HashtagEngagementDto[]> {
    this.logger.log(
      `Getting most effective hashtags for account ${account.id}, timeframe ${query.timeframe}, user ${user.id}`,
    );
    return this.hashtagsService.getMostEffective(account, query.timeframe, query.limit ?? 10, query.minTootCount ?? 2);
  }
}
