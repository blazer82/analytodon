import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator'; // IsString might be removed if not used elsewhere

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
  @IsUrl({ require_tld: false }) // Allow localhost for development
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
