import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

import { IsValidTimezone } from '../../shared/validators/is-valid-timezone.validator';

export class CreateAccountDto {
  @ApiPropertyOptional({
    example: 'My Mastodon Account',
    description: 'A custom name for the account (e.g., for display in UI)',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'https://mastodon.social',
    description: 'The URL of the Mastodon server',
  })
  @IsUrl()
  @IsNotEmpty()
  serverURL!: string;

  @ApiProperty({
    example: 'Europe/Berlin',
    description: 'The timezone for the account',
  })
  @IsValidTimezone()
  @IsNotEmpty()
  timezone!: string;
}
