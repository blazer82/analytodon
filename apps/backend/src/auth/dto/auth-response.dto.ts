import { ApiProperty } from '@nestjs/swagger';

import { SessionUserDto } from './session-user.dto';

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT Access Token' })
  token: string;

  @ApiProperty({ description: 'JWT Refresh Token' })
  refreshToken: string;

  @ApiProperty({ description: 'Access Token expiration in seconds', example: 3600 })
  expiresIn: number;

  @ApiProperty({ description: 'User session information' })
  user: SessionUserDto;
}
