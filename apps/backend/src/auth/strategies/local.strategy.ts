import { UserEntity } from '@analytodon/shared-orm';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email', // Specify that we are using 'email' instead of 'username'
      // passwordField: 'password', // 'password' is the default, so not strictly necessary to specify
    });
  }

  async validate(email: string, pass: string): Promise<UserEntity> {
    const user = await this.authService.validateUser(email, pass);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    return user;
  }
}
