import { UserRole } from '../../shared/enums/user-role.enum';
import { UserEntity } from '../entities/user.entity';

export class UserResponseDto {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
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
