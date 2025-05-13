import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto.ts';
import { RefreshTokenDto } from './dto/refresh-token.dto.ts';
import { TokenResponseDto } from './dto/token-response.dto.ts';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { UserResponseDto } from '../users/dto/user-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // This is a temporary login endpoint for testing token generation.
  // It will be replaced/enhanced by LocalAuthGuard later.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in a user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Successfully logged in.', type: TokenResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid credentials.' })
  async login(@Body() loginDto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User profile retrieved successfully.', type: UserResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized.' })
  getProfile(@GetUser() user: UserEntity): UserResponseDto {
    // request.user is populated by JwtStrategy.validate()
    return new UserResponseDto(user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tokens refreshed successfully.', type: TokenResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid refresh token.' })
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out a user' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Successfully logged out.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized.' })
  async logout(@GetUser() user: UserEntity): Promise<void> {
    return this.authService.logout(user.id);
  }

  // Define other controller methods for authentication routes here
  // e.g., POST /auth/register
}
