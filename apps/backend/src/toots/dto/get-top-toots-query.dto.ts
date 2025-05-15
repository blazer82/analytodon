import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

// Define TootRanking enum based on legacy service
export enum TootRankingEnum {
  TOP = 'top', // Default: replies + reblogs
  REPLIES = 'replies',
  BOOSTS = 'boosts', // reblogs
  FAVOURITES = 'favourites',
}

export class GetTopTootsQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of toots to return',
    default: 5,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 5;

  @ApiPropertyOptional({
    description: 'Ranking criteria for toots',
    enum: TootRankingEnum,
    default: TootRankingEnum.TOP,
  })
  @IsOptional()
  @IsEnum(TootRankingEnum)
  ranking?: TootRankingEnum = TootRankingEnum.TOP;

  // dateFrom and dateTo will be resolved by the calling service (e.g., BoostsService)
  // based on a timeframe string (like 'last30days').
  // The TootsService.getTopToots method itself will expect Date objects.
  // However, if this DTO were to be used directly in a TootsController endpoint,
  // these might be included. For now, keeping it simple as it's used by other services.
}

// This DTO is for the service layer method signature, not directly for controller query params yet.
export interface GetTopTootsOptions {
  accountId: string;
  limit?: number;
  ranking?: TootRankingEnum;
  dateFrom?: Date;
  dateTo?: Date;
}
