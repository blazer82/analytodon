import { ApiProperty } from '@nestjs/swagger';

export class HashtagEngagementDto {
  @ApiProperty({ example: 'typescript' })
  hashtag!: string;

  @ApiProperty({ example: 15 })
  tootCount!: number;

  @ApiProperty({ example: 252 })
  totalEngagement!: number;

  @ApiProperty({ example: 16.8 })
  avgEngagementPerToot!: number;

  @ApiProperty({ example: 42 })
  repliesCount!: number;

  @ApiProperty({ example: 87 })
  reblogsCount!: number;

  @ApiProperty({ example: 123 })
  favouritesCount!: number;
}
