import { ApiProperty } from '@nestjs/swagger';

import { AdminAccountItemDto } from './admin-account-item.dto';

export class AdminAccountsResponseDto {
  @ApiProperty({ type: [AdminAccountItemDto], description: 'List of accounts' })
  items: AdminAccountItemDto[];

  @ApiProperty({ description: 'Total number of matching accounts' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}
