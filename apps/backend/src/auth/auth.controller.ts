import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto.ts';
import { RefreshTokenDto } from './dto/refresh-token.dto.ts';
import { TokenResponseDto } from './dto/token-response.dto.ts';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { UserResponseDto } from '../users/dto/user-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // This is a temporary login endpoint for testing token generation.
  // It will be replaced/enhanced by LocalAuthGuard later.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@GetUser() user: UserEntity): UserResponseDto {
    // request.user is populated by JwtStrategy.validate()
    return new UserResponseDto(user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@GetUser() user: UserEntity): Promise<void> {
    return this.authService.logout(user.id);
  }

  // Define other controller methods for authentication routes here
  // e.g., POST /auth/register
}
