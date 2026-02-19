import { ApiProperty } from '@nestjs/swagger';

export class HashtagOverTimeDto {
  @ApiProperty({ example: ['typescript', 'javascript', 'rust'], type: [String] })
  hashtags!: string[];

  @ApiProperty({
    example: [
      { day: '2024-01-15', typescript: 3, javascript: 1, rust: 0 },
      { day: '2024-01-16', typescript: 1, javascript: 2, rust: 1 },
    ],
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }] },
    },
  })
  data!: Array<Record<string, string | number>>;
}
