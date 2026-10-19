import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export enum FollowerServersStatus {
  Available = 'available',
  Hidden = 'hidden',
  Pending = 'pending',
}

export class FollowerServersQueryDto {
  @ApiPropertyOptional({ example: 10, description: 'Number of top servers to return (default 10, max 50)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number;
}

export class FollowerServerDto {
  @ApiProperty({ example: 'mastodon.social', description: 'Server domain' })
  domain!: string;

  @ApiProperty({ example: 884, description: 'Number of followers on this server' })
  count!: number;

  @ApiProperty({ example: 0.311, description: 'Share of the counted followers on this server (0 to 1)' })
  share!: number;
}

export class FollowerServersOtherDto {
  @ApiProperty({ example: 612, description: 'Number of servers not included in the top list' })
  servers!: number;

  @ApiProperty({ example: 559, description: 'Number of followers on those servers' })
  count!: number;

  @ApiProperty({ example: 0.196, description: 'Share of the counted followers on those servers (0 to 1)' })
  share!: number;
}

export class FollowerServersDto {
  @ApiProperty({
    enum: FollowerServersStatus,
    enumName: 'FollowerServersStatus',
    description:
      'available: distribution data is present; hidden: the server does not expose the follower list; pending: no snapshot yet',
  })
  status!: FollowerServersStatus;

  @ApiPropertyOptional({ description: 'Day of the snapshot' })
  day?: Date;

  @ApiPropertyOptional({ example: 2847, description: 'Follower count reported by the account' })
  totalFollowers?: number;

  @ApiPropertyOptional({
    example: 2847,
    description: 'Number of followers counted (lower than totalFollowers when only a sample was fetched)',
  })
  sampledFollowers?: number;

  @ApiPropertyOptional({ example: 622, description: 'Number of distinct servers among the counted followers' })
  serverCount?: number;

  @ApiPropertyOptional({ example: 'hachyderm.io', description: "Domain of the account's own server" })
  homeServer?: string;

  @ApiPropertyOptional({ example: 0.18, description: "Share of the counted followers on the account's own server" })
  homeShare?: number;

  @ApiPropertyOptional({ type: [FollowerServerDto], description: 'Top servers by follower count' })
  top?: FollowerServerDto[];

  @ApiPropertyOptional({ type: FollowerServersOtherDto, description: 'Aggregate of all servers not in the top list' })
  other?: FollowerServersOtherDto;
}
