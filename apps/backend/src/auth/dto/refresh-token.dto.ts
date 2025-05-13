import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'The refresh token used to obtain a new access token',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
