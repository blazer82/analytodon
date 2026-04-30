import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendEmailDto {
  @ApiProperty({
    example: 'all',
    description: "Recipient group: 'all' or 'active' (last login within 30 days)",
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['all', 'active'])
  recipientGroup!: 'all' | 'active';

  @ApiProperty({ example: 'Important Announcement', description: 'Email subject (English)' })
  @IsString()
  @IsNotEmpty()
  subjectEn!: string;

  @ApiProperty({ example: 'Wichtige Ankündigung', description: 'Email subject (German)' })
  @IsString()
  @IsNotEmpty()
  subjectDe!: string;

  @ApiProperty({
    example: 'Hello [[email]], this is an important message.',
    description: 'Email body text (English)',
  })
  @IsString()
  @IsNotEmpty()
  textEn!: string;

  @ApiProperty({
    example: 'Hallo [[email]], dies ist eine wichtige Nachricht.',
    description: 'Email body text (German)',
  })
  @IsString()
  @IsNotEmpty()
  textDe!: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Send both language versions as test to admin email',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isTest?: boolean = false;
}
