import { UserRole } from '@analytodon/shared-orm';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  // Add any other fields you want in the JWT payload
}
