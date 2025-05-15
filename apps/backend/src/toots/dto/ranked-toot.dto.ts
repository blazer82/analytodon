import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RankedTootDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca', description: 'Toot ID' })
  id!: string;

  @ApiProperty({ example: '<p>This is a toot content.</p>', description: 'HTML content of the toot' })
  content!: string;

  @ApiProperty({ example: 'https://mastodon.social/@user/123456', description: 'URL of the toot' })
  url!: string;

  @ApiProperty({ example: 10, description: 'Number of reblogs (boosts)' })
  reblogsCount!: number;

  @ApiProperty({ example: 5, description: 'Number of replies' })
  repliesCount!: number;

  @ApiProperty({ example: 20, description: 'Number of favourites' })
  favouritesCount!: number;

  @ApiProperty({ example: '2023-01-15T10:00:00.000Z', description: 'Creation date of the toot' })
  createdAt!: Date;

  @ApiPropertyOptional({ description: 'Calculated rank for sorting purposes' })
  rank?: number;
}
