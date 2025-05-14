import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendEmailDto {
  @ApiProperty({
    example: 'all',
    description: "Recipient group: 'all', 'admins', 'account-owners', or 'custom'",
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['all', 'admins', 'account-owners', 'custom'])
  recipientGroup!: 'all' | 'admins' | 'account-owners' | 'custom';

  @ApiPropertyOptional({
    example: 'user1@example.com, user2@example.com',
    description: 'Comma-separated list of email addresses for custom group',
    required: false,
  })
  @IsString()
  @IsOptional()
  // Basic validation, can be improved with a custom validator for list of emails
  recipients?: string;

  @ApiProperty({ example: 'Important Announcement', description: 'Email subject' })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty({ example: 'Hello [[email]], this is an important message.', description: 'Email body text' })
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ApiPropertyOptional({ example: false, description: 'Is this a test email?', required: false })
  @IsBoolean()
  @IsOptional()
  isTest?: boolean = false;
}
