import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'reset-token-from-email',
    description: 'Password reset token',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    example: 'NewP@$$wOrd123',
    description: 'New password (at least 8 characters)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
