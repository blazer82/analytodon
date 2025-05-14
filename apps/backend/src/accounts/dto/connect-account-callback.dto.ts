import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

// DTO for query parameters of GET /accounts/connect/callback
export class ConnectAccountCallbackQueryDto {
  @ApiProperty({
    description: 'State token to prevent CSRF and link the callback to the original request/account.',
    example: 'a_uuid_state_or_jwt_token',
  })
  @IsString()
  @IsNotEmpty()
  token!: string; // This was `token` in legacy, maps to connectionToken in AccountCredentialsEntity

  @ApiProperty({
    description: 'Authorization code provided by Mastodon OAuth server.',
    example: 'abc123xyz789',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
