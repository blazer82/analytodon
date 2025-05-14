import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { IsValidTimezone } from '../../shared/validators/is-valid-timezone.validator';

export class UpdateAccountDto {
  @ApiPropertyOptional({
    example: 'My Updated Mastodon Account',
    description: 'A new custom name for the account',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'America/New_York',
    description: 'The new timezone for the account',
  })
  @IsOptional()
  @IsValidTimezone()
  timezone?: string;
}
