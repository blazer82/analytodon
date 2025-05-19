import { ApiProperty } from '@nestjs/swagger';

export class ConnectAccountResponseDto {
  @ApiProperty({
    example: 'https://mastodon.example/oauth/authorize?client_id=...',
    description: 'The Mastodon OAuth authorization URL to redirect the user to.',
  })
  redirectUrl!: string;

  constructor(redirectUrl: string) {
    this.redirectUrl = redirectUrl;
  }
}
