import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address for password reset request',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
