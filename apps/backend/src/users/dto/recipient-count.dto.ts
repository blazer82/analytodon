import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RecipientCountQueryDto {
  @ApiProperty({
    example: 'all',
    description: "Recipient group: 'all' or 'active' (last login within 30 days)",
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['all', 'active'])
  recipientGroup!: 'all' | 'active';
}

export class RecipientCountResponseDto {
  @ApiProperty({ example: 42, description: 'Number of recipients in the selected group' })
  count!: number;
}
