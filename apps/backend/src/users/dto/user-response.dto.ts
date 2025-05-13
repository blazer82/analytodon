import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../shared/enums/user-role.enum';
import { UserEntity } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca', description: 'User ID' })
  id: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.AccountOwner,
    description: 'User role',
  })
  role: UserRole;

  @ApiProperty({
    example: true,
    description: 'Indicates if the user account is active',
  })
  isActive: boolean;

  @ApiProperty({ description: 'Timestamp of user creation' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of last user update' })
  updatedAt: Date;

  constructor(user: UserEntity) {
    this.id = user.id;
    this.email = user.email;
    this.role = user.role;
    this.isActive = user.isActive;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}
