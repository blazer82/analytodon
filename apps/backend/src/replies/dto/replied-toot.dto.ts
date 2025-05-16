import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// This is a simplified representation. Ideally, a shared TootResponseDto would be used.
export class RepliedTootDto {
  @ApiProperty({ example: '12345', description: 'Toot ID' })
  id!: string;

  @ApiProperty({ example: 'Check out this cool toot!', description: 'Toot content (HTML)' })
  content!: string;

  @ApiProperty({ example: 'https://mastodon.social/@user/12345', description: 'URL of the toot' })
  url!: string;

  @ApiProperty({ example: 10, description: 'Number of boosts (reblogs)' })
  reblogsCount!: number;

  @ApiProperty({ example: 5, description: 'Number of replies' })
  repliesCount!: number;

  @ApiProperty({ example: 20, description: 'Number of favorites' })
  favouritesCount!: number;

  @ApiProperty({ example: '2023-01-15T10:00:00.000Z', description: 'Creation date of the toot' })
  createdAt!: Date;

  @ApiPropertyOptional({ description: 'Calculated rank for sorting' })
  rank?: number;
}
